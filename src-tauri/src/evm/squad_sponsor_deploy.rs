//! Deploy a per-squad sponsor clone via `ISquadSponsorFactory.createSquadSponsorExt`.
//!
//! `squadId` on-chain is `keccak256(parent_id UTF-8 bytes)` where `parent_id` is the squad/network root id.
//! Deployment infra addresses: `pacto_chain_config` (`PACTO_*` env vars; see `.env.example`).

use alloy::network::TransactionBuilder;
use alloy::primitives::{keccak256, Address, B256, U256};
use alloy::providers::Provider;
use alloy::sol_types::SolCall;
use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Runtime};

use super::contracts::pacto_sponsor::SquadVariant;
use super::contracts::pacto_sponsor::ISquadSponsorFactory::{
    createSquadSponsorExtCall, squadsCall,
};
use super::pacto_chain_config;
use super::rpc::{
    call::eth_call_decode, connect_read_provider, connect_signing_provider, contract_call_request,
    send_and_confirm, wallet_err_json, wallet_err_json_with_tx_hash,
};
use super::rpc::signer::{load_embedded_signer, require_treasury_signing_allowed};
use super::wallet_chain_config;

/// Deterministic on-chain squad key for a Pacto parent id (squad or network root).
pub fn squad_id_from_parent_id(parent_id: &str) -> B256 {
    B256::from(keccak256(parent_id.trim().as_bytes()))
}

fn parse_optional_deposit_wei(raw: Option<&str>) -> Result<U256, String> {
    let Some(s) = raw.map(str::trim).filter(|s| !s.is_empty()) else {
        return Ok(U256::ZERO);
    };
    if s.starts_with("0x") || s.starts_with("0X") {
        U256::from_str_radix(s.trim_start_matches("0x").trim_start_matches("0X"), 16)
            .map_err(|e| format!("invalid hex deposit: {e}"))
    } else {
        U256::from_str_radix(s, 10).map_err(|e| format!("invalid decimal deposit: {e}"))
    }
}

fn squad_variant_label(v: SquadVariant) -> &'static str {
    match v {
        SquadVariant::NONE => "none",
        SquadVariant::SPONSOR => "sponsor",
        SquadVariant::EXT => "ext",
        SquadVariant::__Invalid => "unknown",
    }
}

async fn read_squad_record<P: Provider>(
    provider: &P,
    factory: Address,
    squad_id: B256,
) -> Result<(Address, SquadVariant), String> {
    let call = squadsCall {
        squadId: squad_id,
    };
    let decoded = eth_call_decode(provider, factory, &call).await?;
    let sponsor = decoded.sponsor;
    if sponsor.is_zero() {
        return Err("sponsor clone address is zero after deploy".to_string());
    }
    Ok((sponsor, decoded.variant))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SquadSponsorDeployResult {
    pub tx_hash: String,
    pub chain: String,
    pub chain_id: u64,
    /// `0x`-prefixed bytes32 derived from the parent id.
    pub squad_id: String,
    pub sponsor_address: String,
    pub paymaster_address: String,
    pub variant: String,
    /// JSON for `squad_infra.provider_payload` / future announces.
    pub provider_payload: String,
}

#[tauri::command]
pub async fn deploy_squad_sponsor_for_parent<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    parent_id: String,
    initial_deposit_wei: Option<String>,
) -> Result<SquadSponsorDeployResult, String> {
    let pid = parent_id.trim();
    if pid.is_empty() {
        return Err(wallet_err_json(
            "INVALID_PARENT",
            "parent_id must be non-empty",
            None,
        ));
    }

    let net_key = network.to_lowercase();
    let Some(net) = wallet_chain_config::network_by_key(&net_key) else {
        return Err(wallet_err_json(
            "UNSUPPORTED_NETWORK",
            format!("Unknown network: {}", network),
            None,
        ));
    };

    let addrs = pacto_chain_config::squad_sponsor_deploy_addresses(&net.key).map_err(|e| {
        wallet_err_json("SPONSOR_CONFIG", e, None)
    })?;

    let deposit = parse_optional_deposit_wei(initial_deposit_wei.as_deref())
        .map_err(|e| wallet_err_json("INVALID_DEPOSIT", e, None))?;

    let squad_id = squad_id_from_parent_id(pid);
    let calldata = createSquadSponsorExtCall {
        squadId: squad_id,
    }
    .abi_encode();
    let factory = addrs.squad_sponsor_factory;

    let urls = wallet_chain_config::rpc_urls_for(net);
    if urls.is_empty() {
        return Err(wallet_err_json(
            "RPC_CONFIG",
            "no RPC URL configured",
            None,
        ));
    }

    require_treasury_signing_allowed(app.clone()).await?;
    let (_signer, wallet) = load_embedded_signer(app).await?;
    let provider = connect_signing_provider(&urls, wallet).await?;

    let mut tx = contract_call_request(factory, calldata);
    if !deposit.is_zero() {
        tx = tx.with_value(deposit);
    }

    let receipt = send_and_confirm(
        &provider,
        tx,
        "Timed out waiting for sponsor deploy confirmation.",
    )
    .await?;

    let read_provider = connect_read_provider(&urls).await?;
    let (sponsor, variant) =
        read_squad_record(&read_provider, factory, squad_id).await.map_err(|e| {
            wallet_err_json_with_tx_hash(
                "PARSE_DEPLOY",
                e,
                None,
                format!("0x{:x}", receipt.transaction_hash),
            )
        })?;

    let paymaster = addrs.pacto_sponsor_paymaster;
    let variant_str = squad_variant_label(variant).to_string();
    let payload = json!({
        "v": 1,
        "parentId": pid,
        "squadId": format!("{:#x}", squad_id),
        "sponsor": format!("{:#x}", sponsor),
        "paymaster": format!("{:#x}", paymaster),
        "entryPoint": format!("{:#x}", addrs.entry_point),
        "variant": variant_str,
    })
    .to_string();

    Ok(SquadSponsorDeployResult {
        tx_hash: format!("0x{:x}", receipt.transaction_hash),
        chain: net.key.clone(),
        chain_id: net.chain_id,
        squad_id: format!("{:#x}", squad_id),
        sponsor_address: format!("{:#x}", sponsor),
        paymaster_address: format!("{:#x}", paymaster),
        variant: variant_str,
        provider_payload: payload,
    })
}

#[cfg(test)]
mod tests {
    use super::squad_id_from_parent_id;

    #[test]
    fn squad_id_matches_solidity_keccak256_string_bytes() {
        let id = squad_id_from_parent_id("squad-alpha");
        assert_eq!(
            id,
            alloy::primitives::keccak256("squad-alpha".as_bytes()).into()
        );
    }
}
