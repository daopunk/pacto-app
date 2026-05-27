use alloy::network::EthereumWallet;
use alloy::signers::local::PrivateKeySigner;
use rusqlite::OptionalExtension;
use tauri::{AppHandle, Runtime};

use crate::crypto;
use crate::db;
use super::errors::wallet_err_json;
use crate::evm::evm_accounts::{self};

pub async fn require_treasury_signing_allowed<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let ok = evm_accounts::active_account_allows_treasury_signing(app).await?;
    if ok {
        Ok(())
    } else {
        Err(wallet_err_json(
            "IMPORTED_ACCOUNT_NOT_ALLOWED",
            "Treasury and on-chain deployment require a wallet address derived from your recovery phrase.",
            None,
        ))
    }
}

pub async fn load_embedded_signer<R: Runtime>(
    app: AppHandle<R>,
) -> Result<(PrivateKeySigner, EthereumWallet), String> {
    let enc = db::get_evm_pkey(app)
        .map_err(|e| wallet_err_json("DB_ERROR", e, None))?
        .ok_or_else(|| wallet_err_json("NO_EVM_KEY", "EVM key not set for this account", None))?;

    let evm_private_key = crypto::internal_decrypt(enc, None)
        .await
        .map_err(|_| wallet_err_json("DECRYPT_FAILED", "Could not decrypt EVM key", None))?;

    let signer: PrivateKeySigner = evm_private_key
        .parse()
        .map_err(|_| wallet_err_json("INVALID_KEY", "Invalid EVM key format", None))?;

    let wallet = EthereumWallet::from(signer.clone());
    Ok((signer, wallet))
}

async fn private_key_signer_from_account_id<R: Runtime>(
    app: &AppHandle<R>,
    account_id: &str,
) -> Result<(PrivateKeySigner, EthereumWallet), String> {
    let (key_hex, _, _) = evm_accounts::resolve_private_key_hex_for_account_id(app, account_id)
        .await
        .map_err(|e| wallet_err_json("ROSTER_SIGNER", e, None))?;
    let signer: PrivateKeySigner = key_hex
        .parse()
        .map_err(|_| wallet_err_json("INVALID_KEY", "Invalid EVM key format", None))?;
    let wallet = EthereumWallet::from(signer.clone());
    Ok((signer, wallet))
}

/// Squad roster-bound signer when a per-parent account binding exists; otherwise active squad signer.
pub async fn load_squad_roster_embedded_signer<R: Runtime>(
    app: AppHandle<R>,
    parent_id: &str,
) -> Result<(PrivateKeySigner, EthereumWallet), String> {
    let pid = parent_id.trim();
    if pid.is_empty() {
        return load_embedded_signer(app).await;
    }

    if let Some(account_id) = db::get_squad_member_evm_account_id(&app, pid, None)? {
        let conn = crate::account_manager::get_db_connection(&app)?;
        let purpose: String = conn
            .query_row(
                "SELECT purpose FROM evm_accounts WHERE id = ?1",
                rusqlite::params![account_id.as_str()],
                |r| r.get(0),
            )
            .map_err(|_| wallet_err_json("ROSTER_SIGNER", "Roster account not found.", None))?;
        crate::account_manager::return_db_connection(conn);
        if purpose.trim().eq_ignore_ascii_case("advanced") {
            return Err(wallet_err_json(
                "ROSTER_SIGNER",
                "Roster-bound account must be squad-purpose.",
                None,
            ));
        }
        return private_key_signer_from_account_id(&app, account_id.as_str()).await;
    }

    if let Some(member) = crate::account_manager::get_current_account().ok() {
        if let Some(addr) = db::roster_evm_address_for_member(&app, pid, member.as_str())? {
            let conn = crate::account_manager::get_db_connection(&app)?;
            let account_id: Option<String> = conn
                .query_row(
                    "SELECT id FROM evm_accounts WHERE lower(address) = lower(?1) AND lower(purpose) = 'squad' LIMIT 1",
                    rusqlite::params![addr.as_str()],
                    |r| r.get(0),
                )
                .optional()
                .map_err(|e| wallet_err_json("ROSTER_SIGNER", e.to_string(), None))?;
            crate::account_manager::return_db_connection(conn);
            if let Some(id) = account_id {
                return private_key_signer_from_account_id(&app, id.as_str()).await;
            }
        }
    }

    evm_accounts::require_squad_purpose_signer(app.clone())
        .await
        .map_err(|e| wallet_err_json("SQUAD_SIGNER_REQUIRED", e, None))?;
    load_embedded_signer(app).await
}

/// Advanced-purpose signer only; resolves key from `active_advanced_evm_account_id`, not squad active signer.
pub async fn load_advanced_embedded_signer<R: Runtime>(
    app: AppHandle<R>,
) -> Result<(PrivateKeySigner, EthereumWallet), String> {
    let (key_hex, _addr) = evm_accounts::resolve_advanced_signing_material(app)
        .await
        .map_err(|e| wallet_err_json("ADVANCED_SIGNER_REQUIRED", e, None))?;

    let signer: PrivateKeySigner = key_hex
        .parse()
        .map_err(|_| wallet_err_json("INVALID_KEY", "Invalid EVM key format", None))?;

    let wallet = EthereumWallet::from(signer.clone());
    Ok((signer, wallet))
}
