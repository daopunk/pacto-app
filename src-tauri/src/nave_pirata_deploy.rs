//! Deploy a full Nave Pirata stack via `INavePirataFactory.deployNavePirata` using the embedded EVM key.
//!
//! Required env (chain-specific overrides optional):
//! - `PACTO_NAVE_PIRATA_FACTORY` or `PACTO_NAVE_PIRATA_FACTORY_<NET>` where `<NET>` is `MAINNET`, `OPTIMISM`, or `SEPOLIA`.
//! - Same pattern for master copies: `PACTO_NAV_MASTER_QUARTERMASTER`, `_MUTINY`, `_TREASURY_AUTHORITY`, `_SQUAD_ADMIN`
//!   each with optional `_<NET>` suffix.

use alloy::network::{EthereumWallet, TransactionBuilder};
use alloy::primitives::{keccak256, Address, B256, Bytes, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::{TransactionReceipt, TransactionRequest};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol_types::SolCall;
use serde::Serialize;
use serde_json::json;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Runtime};

use crate::contracts::pacto_gov::INavePirataFactory::{
    deployNavePirataCall, CrewVoteMode, DeployParams, SquadParams,
};
use crate::crypto;
use crate::db;
use crate::evm_accounts;
use crate::wallet_chain_config;
use crate::wallet_ops;
use crate::wallet_security;

/// Matches `script/Constants.sol` production-style defaults (`CREW_CHANGE_DELAY`, `PROPOSAL_EXPIRY`, etc.).
const DEFAULT_CREW_CHANGE_DELAY_SEC: u64 = 7 * 24 * 3600;
const DEFAULT_PROPOSAL_EXPIRY_SEC: u64 = 7 * 24 * 3600;
const DEFAULT_QUORUM_BPS: u64 = 3000;

const RECEIPT_WAIT_TIMEOUT: Duration = Duration::from_secs(180);

fn nave_pirata_deployed_topic0() -> B256 {
    B256::from_slice(
        keccak256("NavePirataDeployed(uint256,address,address,address,address,address,address)").as_slice(),
    )
}

fn env_addr_primary_or_net(primary: &str, net_upper: &str) -> Result<Address, String> {
    let suffixed = format!("{}_{}", primary, net_upper);
    std::env::var(&suffixed)
        .or_else(|_| std::env::var(primary))
        .map_err(|_| {
            format!(
                "Set {} or {} to a 0x address (Nave Pirata deployment infra).",
                suffixed, primary
            )
        })
        .and_then(|s| wallet_ops::parse_address(s.trim()))
}

fn parse_salt_nonce(raw: Option<String>) -> Result<U256, String> {
    let Some(s) = raw.filter(|x| !x.trim().is_empty()) else {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "system time before UNIX epoch".to_string())?
            .as_nanos();
        return Ok(U256::from(nanos));
    };
    let t = s.trim();
    if let Some(h) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        return U256::from_str_radix(h, 16).map_err(|_| "invalid salt_nonce hex".to_string());
    }
    U256::from_str_radix(t, 10).map_err(|_| "invalid salt_nonce decimal".to_string())
}

fn address_from_word(data: &[u8], word_index: usize) -> Result<Address, String> {
    let start = word_index
        .checked_mul(32)
        .ok_or_else(|| "word index overflow".to_string())?;
    let end = start
        .checked_add(32)
        .ok_or_else(|| "word offset overflow".to_string())?;
    if data.len() < end {
        return Err("log data too short for address words".to_string());
    }
    Ok(Address::from_slice(&data[start + 12..start + 32]))
}

fn addresses_from_nave_pirata_deployed_log(
    log: &alloy::rpc::types::Log,
    factory: Address,
) -> Result<(U256, Address, Address, Address, Address, Address, Address), String> {
    if log.address() != factory {
        return Err("log address mismatch".to_string());
    }
    let topics = log.topics();
    if topics.first() != Some(&nave_pirata_deployed_topic0()) {
        return Err("unexpected event topic".to_string());
    }
    if topics.len() < 3 {
        return Err("NavePirataDeployed: expected at least 3 topics".to_string());
    }
    let top_hat = U256::from_be_slice(topics[1].as_slice());
    let captain = Address::from_slice(&topics[2].as_slice()[12..32]);
    let data = log.data().data.as_ref();
    let safe = address_from_word(data, 0)?;
    let quartermaster = address_from_word(data, 1)?;
    let mutiny = address_from_word(data, 2)?;
    let treasury = address_from_word(data, 3)?;
    let squad_admin = address_from_word(data, 4)?;
    Ok((top_hat, captain, safe, quartermaster, mutiny, treasury, squad_admin))
}

fn nave_pirata_addresses_from_receipt(
    receipt: &TransactionReceipt,
    factory: Address,
) -> Result<(U256, Address, Address, Address, Address, Address, Address), String> {
    for log in receipt.logs() {
        if let Ok(all) = addresses_from_nave_pirata_deployed_log(log, factory) {
            return Ok(all);
        }
    }
    Err("no NavePirataDeployed log from factory in receipt".into())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NavePirataDeployResult {
    pub tx_hash: String,
    pub chain: String,
    pub chain_id: u64,
    pub top_hat_id: String,
    pub safe_address: String,
    pub quartermaster: String,
    pub mutiny_module: String,
    pub treasury_authority: String,
    pub squad_admin_proxy: String,
    /// JSON string for `parent_governance.provider_payload` / announces (`v`, addresses, parent id).
    pub provider_payload: String,
}

#[tauri::command]
pub async fn deploy_nave_pirata_for_parent<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    parent_id: String,
    captain: String,
    metadata_uri: String,
    salt_nonce: Option<String>,
) -> Result<NavePirataDeployResult, String> {
    let net_key = network.to_lowercase();
    let Some(net) = wallet_chain_config::network_by_key(&net_key) else {
        return Err(wallet_ops::wallet_err_json(
            "UNSUPPORTED_NETWORK",
            format!("Unknown network: {}", network),
            None,
        ));
    };

    let net_upper = net.key.to_ascii_uppercase().replace('-', "_");

    let factory = env_addr_primary_or_net("PACTO_NAVE_PIRATA_FACTORY", &net_upper).map_err(|e| {
        wallet_ops::wallet_err_json("NAVE_PIRATA_CONFIG", e, None)
    })?;
    let qm = env_addr_primary_or_net("PACTO_NAV_MASTER_QUARTERMASTER", &net_upper).map_err(|e| {
        wallet_ops::wallet_err_json("NAVE_PIRATA_CONFIG", e, None)
    })?;
    let mm = env_addr_primary_or_net("PACTO_NAV_MASTER_MUTINY", &net_upper).map_err(|e| {
        wallet_ops::wallet_err_json("NAVE_PIRATA_CONFIG", e, None)
    })?;
    let ta = env_addr_primary_or_net("PACTO_NAV_MASTER_TREASURY_AUTHORITY", &net_upper).map_err(|e| {
        wallet_ops::wallet_err_json("NAVE_PIRATA_CONFIG", e, None)
    })?;
    let squad_admin = env_addr_primary_or_net("PACTO_NAV_MASTER_SQUAD_ADMIN", &net_upper).map_err(|e| {
        wallet_ops::wallet_err_json("NAVE_PIRATA_CONFIG", e, None)
    })?;

    let captain_addr =
        wallet_ops::parse_address(captain.trim()).map_err(|e| wallet_ops::wallet_err_json("INVALID_CAPTAIN", e, None))?;

    let meta = metadata_uri.trim().to_string();
    if meta.is_empty() {
        return Err(wallet_ops::wallet_err_json(
            "INVALID_METADATA",
            "metadata_uri must be non-empty",
            None,
        ));
    }

    let salt = parse_salt_nonce(salt_nonce).map_err(|e| wallet_ops::wallet_err_json("INVALID_SALT_NONCE", e, None))?;

    let squad_params = SquadParams {
        crewChangeDelay: U256::from(DEFAULT_CREW_CHANGE_DELAY_SEC),
        proposalExpiry: U256::from(DEFAULT_PROPOSAL_EXPIRY_SEC),
        crewVoteMode: CrewVoteMode::MAJORITY_SNAPSHOT,
        quorumBps: U256::from(DEFAULT_QUORUM_BPS),
    };

    let params = DeployParams {
        captain: captain_addr,
        metadataURI: meta.clone(),
        squadParams: squad_params,
        quartermasterMasterCopy: qm,
        mutinyMasterCopy: mm,
        treasuryAuthorityMasterCopy: ta,
        squadAdminImplementation: squad_admin,
        saltNonce: salt,
    };

    let calldata = deployNavePirataCall { _params: params }.abi_encode();

    let urls = wallet_chain_config::rpc_urls_for(net);
    if urls.is_empty() {
        return Err(wallet_ops::wallet_err_json(
            "RPC_CONFIG",
            "no RPC URL configured",
            None,
        ));
    }

    let treasury_ok = evm_accounts::active_account_allows_treasury_signing(app.clone()).await?;
    if !treasury_ok {
        return Err(wallet_ops::wallet_err_json(
            "IMPORTED_ACCOUNT_NOT_ALLOWED",
            "Nave Pirata deployment requires a wallet address derived from your recovery phrase.",
            None,
        ));
    }

    let enc = db::get_evm_pkey(app.clone())
        .map_err(|e| wallet_ops::wallet_err_json("DB_ERROR", e, None))?
        .ok_or_else(|| wallet_ops::wallet_err_json("NO_EVM_KEY", "EVM key not set for this account", None))?;

    let evm_private_key = crypto::internal_decrypt(enc, None)
        .await
        .map_err(|_| wallet_ops::wallet_err_json("DECRYPT_FAILED", "Could not decrypt EVM key", None))?;

    let signer: PrivateKeySigner = evm_private_key
        .parse()
        .map_err(|_| wallet_ops::wallet_err_json("INVALID_KEY", "Invalid EVM key format", None))?;

    let wallet = EthereumWallet::from(signer);
    let mut provider_opt = None;
    let mut connect_last = String::new();
    for url_s in &urls {
        if url_s.parse::<url::Url>().is_err() {
            connect_last = "invalid RPC URL".to_string();
            continue;
        }
        match ProviderBuilder::new()
            .wallet(wallet.clone())
            .connect(url_s.as_str())
            .await
        {
            Ok(p) => {
                provider_opt = Some(p);
                break;
            }
            Err(e) => {
                connect_last = wallet_security::redact_urls_in_text(&e.to_string());
            }
        }
    }
    let provider = match provider_opt {
        Some(p) => p,
        None => {
            return Err(wallet_ops::wallet_err_json(
                "RPC_CONNECT",
                format!(
                    "tried {} URL(s), last error: {}",
                    urls.len(),
                    connect_last
                ),
                None,
            ));
        }
    };

    let tx = TransactionRequest::default()
        .with_to(factory)
        .with_input(Bytes::from(calldata));

    let pending = provider
        .send_transaction(tx)
        .await
        .map_err(|e| {
            wallet_ops::wallet_err_json(
                "SEND_FAILED",
                wallet_security::redact_urls_in_text(&e.to_string()),
                None,
            )
        })?;

    let submitted_tx_hash = format!("0x{:x}", *pending.tx_hash());
    let receipt = pending
        .with_timeout(Some(RECEIPT_WAIT_TIMEOUT))
        .get_receipt()
        .await
        .map_err(|_| {
            wallet_ops::wallet_err_json_with_tx_hash(
                "RECEIPT_TIMEOUT",
                "Timed out waiting for confirmation.",
                None,
                submitted_tx_hash.clone(),
            )
        })?;

    if !receipt.status() {
        return Err(wallet_ops::wallet_err_json(
            "TX_REVERTED",
            "Transaction was mined but reverted",
            None,
        ));
    }

    let (top_hat, _captain_out, safe_a, qm_a, mm_a, ta_a, admin_a) =
        nave_pirata_addresses_from_receipt(&receipt, factory).map_err(|e| {
            wallet_ops::wallet_err_json_with_tx_hash(
                "PARSE_RECEIPT",
                e,
                None,
                format!("0x{:x}", receipt.transaction_hash),
            )
        })?;

    let top_hat_str = top_hat.to_string();
    let payload = json!({
        "v": 1,
        "parentId": parent_id.trim(),
        "safe": format!("{:#x}", safe_a),
        "quartermaster": format!("{:#x}", qm_a),
        "mutinyModule": format!("{:#x}", mm_a),
        "treasuryAuthority": format!("{:#x}", ta_a),
        "squadAdminProxy": format!("{:#x}", admin_a),
    })
    .to_string();

    Ok(NavePirataDeployResult {
        tx_hash: format!("0x{:x}", receipt.transaction_hash),
        chain: net.key.clone(),
        chain_id: net.chain_id,
        top_hat_id: top_hat_str,
        safe_address: format!("{:#x}", safe_a),
        quartermaster: format!("{:#x}", qm_a),
        mutiny_module: format!("{:#x}", mm_a),
        treasury_authority: format!("{:#x}", ta_a),
        squad_admin_proxy: format!("{:#x}", admin_a),
        provider_payload: payload,
    })
}
