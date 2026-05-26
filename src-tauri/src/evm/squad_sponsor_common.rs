//! Shared squad sponsor helpers (squad id derivation, factory registry reads).

use alloy::primitives::{keccak256, Address, B256, U256};
use alloy::providers::Provider;

use super::contracts::pacto_sponsor::SquadVariant;
use super::contracts::pacto_sponsor::ISquadSponsorFactory::squadsCall;
use super::rpc::call::eth_call_decode;

/// Deterministic on-chain squad key for a Pacto parent id (squad or network root).
pub fn squad_id_from_parent_id(parent_id: &str) -> B256 {
    B256::from(keccak256(parent_id.trim().as_bytes()))
}

pub fn squad_variant_label(v: SquadVariant) -> &'static str {
    match v {
        SquadVariant::NONE => "none",
        SquadVariant::SPONSOR => "sponsor",
        SquadVariant::EXT => "ext",
        SquadVariant::__Invalid => "unknown",
    }
}

pub async fn read_squad_record<P: Provider>(
    provider: &P,
    factory: Address,
    squad_id: B256,
) -> Result<(Address, SquadVariant, U256), String> {
    let call = squadsCall {
        squadId: squad_id,
    };
    let decoded = eth_call_decode(provider, factory, &call).await?;
    let sponsor = decoded.sponsor;
    if sponsor.is_zero() {
        return Err("no sponsor clone registered for this squad id".to_string());
    }
    Ok((sponsor, decoded.variant, decoded.topHatId))
}
