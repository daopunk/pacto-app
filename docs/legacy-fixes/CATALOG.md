# Legacy fixes — removal catalog

Review before **public v1**. Remove from code when alpha/dev cohort no longer needs the path.

| ID | Summary | Code / entry points | Note |
|----|---------|---------------------|------|
| LF-001 | Wrong EVM `evm_address` stored (hashed `0x04` prefix); auto-repair from decrypted EVM key | `db::repair_evm_address_if_needed`; `db::get_evm_address`; `get_wallet_summary` | [LF-001-evm-address-repair.md](./LF-001-evm-address-repair.md) |

_Add new rows above this line._
