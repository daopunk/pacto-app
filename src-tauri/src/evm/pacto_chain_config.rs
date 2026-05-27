//! On-chain deployment addresses for pacto-gov and pacto-squad-sponsor.
//!
//! Read from environment at runtime (`PACTO_*` vars). Optional `_SEPOLIA` / `_MAINNET` / `_OPTIMISM`
//! suffix overrides the unsuffixed primary name. See `.env.example` and `ai-docs/INHOUSE_GOV.md`.

use alloy::primitives::Address;

use super::contracts::safe::SafeFactoryAddresses;
use super::rpc::parse_address;

fn net_suffix(net_key: &str) -> String {
    net_key.to_ascii_uppercase().replace('-', "_")
}

/// `PACTO_FOO` or `PACTO_FOO_SEPOLIA` (etc.).
pub fn env_addr_primary_or_net(primary: &str, net_key: &str) -> Result<Address, String> {
    let net_upper = net_suffix(net_key);
    let suffixed = format!("{}_{}", primary, net_upper);
    std::env::var(&suffixed)
        .or_else(|_| std::env::var(primary))
        .map_err(|_| {
            format!(
                "Set {} or {} to a 0x address.",
                suffixed, primary
            )
        })
        .and_then(|s| parse_address(s.trim()))
}

fn env_addr_optional(primary: &str, net_key: &str) -> Option<Address> {
    env_addr_primary_or_net(primary, net_key).ok()
}

#[derive(Clone, Debug)]
pub struct PactoGovDeployAddresses {
    pub nave_pirata_factory: Address,
    pub master_quartermaster: Address,
    pub master_mutiny: Address,
    pub master_treasury_authority: Address,
    pub master_squad_admin_impl: Address,
    pub master_squad_admin_ext_impl: Address,
    pub nave_pirata_registry: Option<Address>,
    pub hats: Option<Address>,
    pub role_hat_clones_factory: Option<Address>,
    pub role_hat_upgrader: Option<Address>,
}

pub fn pacto_gov_deploy_addresses(net_key: &str) -> Result<PactoGovDeployAddresses, String> {
    Ok(PactoGovDeployAddresses {
        nave_pirata_factory: env_addr_primary_or_net("PACTO_NAVE_PIRATA_FACTORY", net_key)?,
        master_quartermaster: env_addr_primary_or_net("PACTO_NAV_MASTER_QUARTERMASTER", net_key)?,
        master_mutiny: env_addr_primary_or_net("PACTO_NAV_MASTER_MUTINY", net_key)?,
        master_treasury_authority: env_addr_primary_or_net(
            "PACTO_NAV_MASTER_TREASURY_AUTHORITY",
            net_key,
        )?,
        master_squad_admin_impl: env_addr_primary_or_net("PACTO_NAV_MASTER_SQUAD_ADMIN", net_key)?,
        master_squad_admin_ext_impl: env_addr_primary_or_net(
            "PACTO_NAV_MASTER_SQUAD_ADMIN_EXT",
            net_key,
        )?,
        nave_pirata_registry: env_addr_optional("PACTO_NAVE_PIRATA_REGISTRY", net_key),
        hats: env_addr_optional("PACTO_HATS", net_key),
        role_hat_clones_factory: env_addr_optional("PACTO_ROLE_HAT_CLONES_FACTORY", net_key),
        role_hat_upgrader: env_addr_optional("PACTO_ROLE_HAT_UPGRADER", net_key),
    })
}

#[derive(Clone, Debug)]
pub struct SquadSponsorDeployAddresses {
    pub squad_sponsor_factory: Address,
    pub pacto_sponsor_paymaster: Address,
    pub entry_point: Address,
    pub nave_pirata_registry: Option<Address>,
}

pub fn squad_sponsor_deploy_addresses(net_key: &str) -> Result<SquadSponsorDeployAddresses, String> {
    Ok(SquadSponsorDeployAddresses {
        squad_sponsor_factory: env_addr_primary_or_net("PACTO_SQUAD_SPONSOR_FACTORY", net_key)?,
        pacto_sponsor_paymaster: env_addr_primary_or_net("PACTO_SPONSOR_PAYMASTER", net_key)?,
        entry_point: env_addr_primary_or_net("PACTO_ENTRY_POINT", net_key)?,
        nave_pirata_registry: env_addr_optional("PACTO_NAVE_PIRATA_REGISTRY", net_key),
    })
}

/// Safe factory bundle: env override when `PACTO_SAFE_PROXY_FACTORY` (+ singleton) is set, else defaults.
pub fn safe_factory_addresses(net_key: &str, chain_id: u64) -> Option<SafeFactoryAddresses> {
    let factory = env_addr_optional("PACTO_SAFE_PROXY_FACTORY", net_key);
    let singleton = env_addr_optional("PACTO_SAFE_SINGLETON", net_key);
    if let (Some(proxy_factory), Some(singleton)) = (factory, singleton) {
        let fallback_handler = env_addr_optional("PACTO_SAFE_FALLBACK_HANDLER", net_key)
            .or_else(|| default_fallback_for_chain_id(chain_id))?;
        return Some(SafeFactoryAddresses {
            singleton,
            proxy_factory,
            fallback_handler,
        });
    }
    super::contracts::safe::default_safe_factory_addresses_for_chain_id(chain_id)
}

fn default_fallback_for_chain_id(chain_id: u64) -> Option<Address> {
    super::contracts::safe::default_safe_factory_addresses_for_chain_id(chain_id)
        .map(|a| a.fallback_handler)
}
