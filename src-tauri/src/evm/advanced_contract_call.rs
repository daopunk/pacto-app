//! Advanced-purpose contract calls (Phase H full implementation; Phase G gate only).

use tauri::{AppHandle, Runtime};

use super::evm_accounts;
use super::rpc::wallet_err_json;

/// Stub: verifies the active advanced account is set and has `advanced` purpose.
/// Full calldata send ships in Phase H (`evm_send_advanced_contract_call` body).
#[tauri::command]
pub async fn evm_send_advanced_contract_call<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    to: String,
    value_wei: String,
    data_hex: String,
) -> Result<(), String> {
    let _ = (network, to, value_wei, data_hex);
    evm_accounts::require_advanced_purpose_signer(app).await?;
    Err(wallet_err_json(
        "ADVANCED_SEND_DEFERRED",
        "Advanced contract sends ship in Phase H. Account purpose gate passed.",
        None,
    ))
}
