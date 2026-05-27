//! Advanced-purpose opaque contract calls (Phase H). Squad keys use curated commands instead.

use alloy::network::{ReceiptResponse, TransactionBuilder};
use alloy::primitives::{Bytes, U256};
use alloy::rpc::types::TransactionRequest;
use serde::Serialize;
use tauri::{AppHandle, Runtime};

use super::evm_accounts;
use super::rpc::{connect_signing_provider, parse_address, send_and_confirm, wallet_err_json};
use super::rpc::signer::load_advanced_embedded_signer;
use super::wallet_chain_config;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedContractCallResult {
    pub tx_hash: String,
    pub network: String,
    pub chain_id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_number: Option<String>,
}

fn parse_data_hex(raw: &str) -> Result<Vec<u8>, String> {
    let t = raw.trim();
    if t.is_empty() || t.eq_ignore_ascii_case("0x") {
        return Ok(Vec::new());
    }
    let h = t
        .strip_prefix("0x")
        .or_else(|| t.strip_prefix("0X"))
        .unwrap_or(t);
    if h.len() % 2 != 0 {
        return Err("Calldata hex must have an even number of digits.".to_string());
    }
    if !h.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("Calldata contains non-hex characters.".to_string());
    }
    hex::decode(h).map_err(|_| "Invalid calldata hex.".to_string())
}

fn parse_value_wei(raw: &str) -> Result<U256, String> {
    let t = raw.trim();
    if t.is_empty() {
        return Ok(U256::ZERO);
    }
    U256::from_str_radix(t, 10)
        .map_err(|_| "valueWei must be a non-negative decimal wei string.".to_string())
}

#[tauri::command]
pub async fn evm_send_advanced_contract_call<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    to: String,
    value_wei: String,
    data_hex: String,
) -> Result<AdvancedContractCallResult, String> {
    let net_key = network.to_lowercase();
    let Some(net) = wallet_chain_config::network_by_key(&net_key) else {
        return Err(wallet_err_json(
            "UNSUPPORTED_NETWORK",
            format!("Unknown network: {}", network),
            None,
        ));
    };

    let to_addr = parse_address(to.trim())
        .map_err(|e| wallet_err_json("INVALID_TO_ADDRESS", e, None))?;
    let value = parse_value_wei(&value_wei)
        .map_err(|e| wallet_err_json("INVALID_VALUE", e, None))?;
    let data = parse_data_hex(&data_hex).map_err(|e| wallet_err_json("INVALID_DATA", e, None))?;

    evm_accounts::require_advanced_purpose_signer(app.clone())
        .await
        .map_err(|e| wallet_err_json("ADVANCED_SIGNER_REQUIRED", e, None))?;

    let urls = wallet_chain_config::rpc_urls_for(net);
    if urls.is_empty() {
        return Err(wallet_err_json("RPC_CONFIG", "no RPC URL configured", None));
    }

    let (_signer, wallet) = load_advanced_embedded_signer(app.clone()).await?;
    let provider = connect_signing_provider(&urls, wallet).await?;

    let tx = TransactionRequest::default()
        .with_to(to_addr.into())
        .with_value(value)
        .with_input(Bytes::from(data));

    let receipt = send_and_confirm(
        &provider,
        tx,
        "Timed out waiting for confirmation. The transaction may still complete; check a block explorer using the hash below.",
    )
    .await?;

    Ok(AdvancedContractCallResult {
        tx_hash: format!("0x{:x}", receipt.transaction_hash),
        network: net.key.clone(),
        chain_id: net.chain_id,
        block_number: receipt.block_number().map(|n| n.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::{parse_data_hex, parse_value_wei};
    use alloy::primitives::U256;

    #[test]
    fn parse_data_hex_accepts_empty_and_prefixed() {
        assert!(parse_data_hex("").unwrap().is_empty());
        assert!(parse_data_hex("0x").unwrap().is_empty());
        assert_eq!(parse_data_hex("0xdeadbeef").unwrap(), vec![0xde, 0xad, 0xbe, 0xef]);
    }

    #[test]
    fn parse_value_wei_decimal() {
        assert_eq!(parse_value_wei("0").unwrap(), U256::ZERO);
        assert_eq!(parse_value_wei("1000").unwrap(), U256::from(1000u64));
    }
}
