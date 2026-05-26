use alloy::network::EthereumWallet;
use alloy::signers::local::PrivateKeySigner;
use tauri::{AppHandle, Runtime};

use crate::crypto;
use crate::db;
use super::errors::wallet_err_json;
use crate::evm::evm_accounts;

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
