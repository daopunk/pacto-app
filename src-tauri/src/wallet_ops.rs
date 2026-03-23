//! Embedded wallet: balances (`get_wallet_summary`) and send (`wallet_build_and_send_transaction`).
//! Chain/asset table: `wallet_chain_config` (compile-time `wallet-assets.json` + chain IDs + default RPC).

use alloy::network::{EthereumWallet, ReceiptResponse, TransactionBuilder};
use alloy::primitives::{utils::parse_units, Address, Bytes, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::TransactionRequest;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::sol_types::SolCall;
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Runtime};

use crate::crypto;
use crate::db;
use crate::wallet_chain_config;
use crate::wallet_prices;
use crate::wallet_security;

sol! {
    interface IERC20 {
        function balanceOf(address account) external view returns (uint256);
        function transfer(address to, uint256 amount) external returns (bool);
    }
}

/// How long to wait for `eth_getTransactionReceipt` after broadcast (mainnet can exceed 20s).
const RECEIPT_WAIT_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WalletSummaryAsset {
    pub symbol: String,
    pub balance_raw: String,
    pub balance_decimal: String,
    pub usd_value: Option<f64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WalletSummaryNetwork {
    pub network: String,
    pub chain_id: u64,
    pub assets: Vec<WalletSummaryAsset>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WalletSummary {
    pub networks: Vec<WalletSummaryNetwork>,
    pub total_usd_approx: f64,
    pub prices: wallet_prices::WalletUsdSpotPrices,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletSendResult {
    pub tx_hash: String,
    pub network: String,
    pub chain_id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_number: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletOpError {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    npub: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tx_hash: Option<String>,
}

pub(crate) fn wallet_err_json(code: &str, message: impl Into<String>, npub: Option<String>) -> String {
    serde_json::to_string(&WalletOpError {
        code: code.to_string(),
        message: message.into(),
        npub,
        tx_hash: None,
    })
    .unwrap_or_else(|_| r#"{"code":"INTERNAL","message":"serialize"}"#.to_string())
}

pub(crate) fn wallet_err_json_with_tx_hash(
    code: &str,
    message: impl Into<String>,
    npub: Option<String>,
    tx_hash: String,
) -> String {
    serde_json::to_string(&WalletOpError {
        code: code.to_string(),
        message: message.into(),
        npub,
        tx_hash: Some(tx_hash),
    })
    .unwrap_or_else(|_| r#"{"code":"INTERNAL","message":"serialize"}"#.to_string())
}

fn decode_balance_of_return(data: &[u8]) -> Result<U256, String> {
    if data.len() < 32 {
        return Err("balanceOf return too short".into());
    }
    let w = &data[data.len() - 32..];
    Ok(U256::from_be_slice(w))
}

fn format_decimal(raw: U256, decimals: u8) -> String {
    use alloy::primitives::utils::format_units;
    format_units(raw, decimals).unwrap_or_else(|_| raw.to_string())
}

async fn erc20_balance(
    provider: &impl Provider,
    token: Address,
    owner: Address,
) -> Result<U256, String> {
    let call = IERC20::balanceOfCall { account: owner };
    let input = call.abi_encode();
    let tx = TransactionRequest::default()
        .to(token)
        .input(Bytes::from(input).into());
    let out = provider
        .call(tx.into())
        .await
        .map_err(|e| {
            wallet_security::redact_urls_in_text(&format!("eth_call balanceOf: {}", e))
        })?;
    decode_balance_of_return(out.as_ref())
}

fn parse_address(s: &str) -> Result<Address, String> {
    let t = s.trim();
    let h = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")).unwrap_or(t);
    if h.len() != 40 || !h.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("invalid EVM address".into());
    }
    let mut b = [0u8; 20];
    for i in 0..20 {
        b[i] = u8::from_str_radix(&h[i * 2..i * 2 + 2], 16)
            .map_err(|_| "invalid hex in address")?;
    }
    Ok(Address::from(b))
}

/// Public RPCs often return HTTP 522 / gateway errors or time out; caller should try the next URL.
fn is_retryable_wallet_rpc_error(msg: &str) -> bool {
    let m = msg.to_lowercase();
    m.contains("522")
        || m.contains("523")
        || m.contains("524")
        || m.contains("timeout")
        || m.contains("timed out")
        || m.contains("connection refused")
        || m.contains("connection reset")
        || m.contains("429")
        || m.contains("502")
        || m.contains("503")
        || m.contains("504")
}

/// Tauri command: per-network ETH + USDC + USDT balances and USD total (Chainlink prices on mainnet).
#[tauri::command]
pub async fn get_wallet_summary<R: Runtime>(app: AppHandle<R>) -> Result<WalletSummary, String> {
    let _ = db::repair_evm_address_if_needed(&app).await;
    let addr_str = db::read_stored_evm_address(app.clone())?
        .ok_or_else(|| "No EVM address for this account. Log in again or set your wallet address.".to_string())?;
    let owner = parse_address(&addr_str)?;

    let prices = wallet_prices::wallet_get_usd_spot_prices()
        .await
        .map_err(|e| {
            wallet_security::redact_urls_in_text(&format!("USD prices unavailable: {}", e))
        })?;

    let mut networks_out = Vec::new();
    let mut total_usd = 0.0_f64;

    for net in wallet_chain_config::wallet_networks() {
        let urls = wallet_chain_config::rpc_urls_for(net);
        if urls.is_empty() {
            return Err(format!("{}: no RPC URL configured", net.key));
        }

        let usdc_a: Address = net
            .usdc_address
            .parse()
            .map_err(|_| format!("{}: bad USDC address in wallet-assets.json", net.key))?;
        let usdt_a: Address = net
            .usdt_address
            .parse()
            .map_err(|_| format!("{}: bad USDT address in wallet-assets.json", net.key))?;

        let mut last_err = String::new();
        let mut triple: Option<(U256, U256, U256)> = None;

        'next_url: for url_s in &urls {
            if url_s.parse::<url::Url>().is_err() {
                last_err = "invalid RPC URL".to_string();
                continue;
            }

            let provider = match ProviderBuilder::new().connect(url_s.as_str()).await {
                Ok(p) => p,
                Err(e) => {
                    last_err = wallet_security::redact_urls_in_text(&format!("{}", e));
                    if !is_retryable_wallet_rpc_error(&last_err) {
                        return Err(format!("{}: RPC connect: {}", net.key, last_err));
                    }
                    continue;
                }
            };

            let eth_raw = match provider.get_balance(owner).await {
                Ok(v) => v,
                Err(e) => {
                    let msg = wallet_security::redact_urls_in_text(&format!("{}", e));
                    if is_retryable_wallet_rpc_error(&msg) {
                        last_err = format!("{} getBalance: {}", net.key, msg);
                        continue 'next_url;
                    }
                    return Err(format!("{} getBalance: {}", net.key, msg));
                }
            };

            let usdc_raw = match erc20_balance(&provider, usdc_a, owner).await {
                Ok(v) => v,
                Err(e) => {
                    if is_retryable_wallet_rpc_error(&e) {
                        last_err = e;
                        continue 'next_url;
                    }
                    return Err(e);
                }
            };

            let usdt_raw = match erc20_balance(&provider, usdt_a, owner).await {
                Ok(v) => v,
                Err(e) => {
                    if is_retryable_wallet_rpc_error(&e) {
                        last_err = e;
                        continue 'next_url;
                    }
                    return Err(e);
                }
            };

            triple = Some((eth_raw, usdc_raw, usdt_raw));
            break;
        }

        let (eth_raw, usdc_raw, usdt_raw) = triple.ok_or_else(|| {
            format!(
                "{}: all {} RPC endpoint(s) failed (last: {})",
                net.key,
                urls.len(),
                last_err
            )
        })?;

        let eth_dec = format_decimal(eth_raw, net.native_decimals);
        let eth_usd = (prices.eth_usd * eth_dec.parse::<f64>().unwrap_or(0.0)).max(0.0);
        total_usd += eth_usd;

        let usdc_dec = format_decimal(usdc_raw, net.usdc_decimals);
        let usdt_dec = format_decimal(usdt_raw, net.usdt_decimals);
        let usdc_usd = (prices.usdc_usd * usdc_dec.parse::<f64>().unwrap_or(0.0)).max(0.0);
        let usdt_usd = (prices.usdt_usd * usdt_dec.parse::<f64>().unwrap_or(0.0)).max(0.0);
        total_usd += usdc_usd + usdt_usd;

        networks_out.push(WalletSummaryNetwork {
            network: net.key.clone(),
            chain_id: net.chain_id,
            assets: vec![
                WalletSummaryAsset {
                    symbol: net.native_symbol.clone(),
                    balance_raw: eth_raw.to_string(),
                    balance_decimal: eth_dec,
                    usd_value: Some(eth_usd),
                },
                WalletSummaryAsset {
                    symbol: "USDC".into(),
                    balance_raw: usdc_raw.to_string(),
                    balance_decimal: usdc_dec,
                    usd_value: Some(usdc_usd),
                },
                WalletSummaryAsset {
                    symbol: "USDT".into(),
                    balance_raw: usdt_raw.to_string(),
                    balance_decimal: usdt_dec,
                    usd_value: Some(usdt_usd),
                },
            ],
        });
    }

    Ok(WalletSummary {
        networks: networks_out,
        total_usd_approx: total_usd,
        prices,
    })
}

/// Tauri command: resolve peer `profiles.evm_address`, build tx, sign with stored EVM key, broadcast, wait for receipt.
#[tauri::command]
pub async fn wallet_build_and_send_transaction<R: Runtime>(
    app: AppHandle<R>,
    to_npub: String,
    network: String,
    asset: String,
    amount: String,
) -> Result<WalletSendResult, String> {
    let net_key = network.to_lowercase();
    let Some(net) = wallet_chain_config::network_by_key(&net_key) else {
        return Err(wallet_err_json(
            "UNSUPPORTED_NETWORK",
            format!("Unknown network: {}", network),
            None,
        ));
    };

    let asset_up = asset.to_uppercase();
    if asset_up != "ETH" && asset_up != "USDC" && asset_up != "USDT" {
        return Err(wallet_err_json(
            "UNSUPPORTED_ASSET",
            format!("Unknown asset: {}", asset),
            None,
        ));
    }

    let peer_addr_opt = db::get_profile_evm_address(&app, &to_npub)
        .map_err(|e| wallet_err_json("DB_ERROR", e, Some(to_npub.clone())))?;

    let Some(peer_raw) = peer_addr_opt else {
        log::warn!(
            target: "pacto_wallet",
            "wallet_build_and_send_transaction: missing evm_address for npub prefix={}…",
            to_npub.chars().take(16).collect::<String>()
        );
        return Err(wallet_err_json(
            "MISSING_PEER_EVM_ADDRESS",
            "This contact has no EVM payout address on file. They must use Pacto with a published profile address or you need a synced profile that includes evm_address.",
            Some(to_npub.clone()),
        ));
    };

    let to_addr = match parse_address(&peer_raw) {
        Ok(a) => a,
        Err(e) => {
            return Err(wallet_err_json(
                "INVALID_PEER_EVM_ADDRESS",
                e,
                Some(to_npub.clone()),
            ))
        }
    };

    let urls = wallet_chain_config::rpc_urls_for(net);
    if urls.is_empty() {
        return Err(wallet_err_json("RPC_CONFIG", "no RPC URL configured", None));
    }

    let enc = db::get_evm_pkey(app.clone())
        .map_err(|e| wallet_err_json("DB_ERROR", e, None))?
        .ok_or_else(|| wallet_err_json("NO_EVM_KEY", "EVM key not set for this account", None))?;

    // Never log or return decrypted EVM key hex; use only to build the signer.
    let evm_private_key = crypto::internal_decrypt(enc, None)
        .await
        .map_err(|_| wallet_err_json("DECRYPT_FAILED", "Could not decrypt EVM key", None))?;

    let signer: PrivateKeySigner = evm_private_key
        .parse()
        .map_err(|_| {
            // Do not echo parse errors — may reflect key material length/format.
            wallet_err_json("INVALID_KEY", "Invalid EVM key format", None)
        })?;

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
            return Err(wallet_err_json(
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

    let pending = if asset_up == "ETH" {
        let v = parse_units(&amount, net.native_decimals).map_err(|e| {
            wallet_err_json("INVALID_AMOUNT", format!("{}", e), None)
        })?;
        let tx = TransactionRequest::default()
            .with_to(to_addr.into())
            .with_value(v.into());
        provider
            .send_transaction(tx)
            .await
            .map_err(|e| {
                wallet_err_json(
                    "SEND_FAILED",
                    wallet_security::redact_urls_in_text(&e.to_string()),
                    None,
                )
            })?
    } else {
        let (token_addr, dec) = if asset_up == "USDC" {
            (&net.usdc_address, net.usdc_decimals)
        } else {
            (&net.usdt_address, net.usdt_decimals)
        };
        let v = parse_units(&amount, dec).map_err(|e| {
            wallet_err_json("INVALID_AMOUNT", format!("{}", e), None)
        })?;
        let token: Address = token_addr
            .parse()
            .map_err(|_| wallet_err_json("INTERNAL", "bad token address in chain config", None))?;
        let call = IERC20::transferCall {
            to: to_addr,
            amount: v.into(),
        };
        let input = call.abi_encode();
        let tx = TransactionRequest::default()
            .with_to(token.into())
            .with_input(Bytes::from(input));
        provider
            .send_transaction(tx)
            .await
            .map_err(|e| {
                wallet_err_json(
                    "SEND_FAILED",
                    wallet_security::redact_urls_in_text(&e.to_string()),
                    None,
                )
            })?
    };

    let submitted_tx_hash = format!("0x{:x}", *pending.tx_hash());
    let receipt = pending
        .with_timeout(Some(RECEIPT_WAIT_TIMEOUT))
        .get_receipt()
        .await
        .map_err(|_| {
            wallet_err_json_with_tx_hash(
                "RECEIPT_TIMEOUT",
                "Timed out waiting for confirmation. The transaction may still complete; check a block explorer using the hash below.",
                None,
                submitted_tx_hash,
            )
        })?;

    if !receipt.status() {
        return Err(wallet_err_json(
            "TX_REVERTED",
            "Transaction was mined but reverted",
            None,
        ));
    }

    Ok(WalletSendResult {
        tx_hash: format!("0x{:x}", receipt.transaction_hash),
        network: net.key.clone(),
        chain_id: net.chain_id,
        block_number: receipt.block_number().map(|n| n.to_string()),
    })
}
