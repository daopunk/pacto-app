# pacto-gov git submodule

Governance contract sources and ABIs for **Nave Pirata** live in [covenant-gov/pacto-gov](https://github.com/covenant-gov/pacto-gov). This repo vendors that repository as a **pinned submodule** so Rust (Alloy) bindings stay aligned with a reviewed revision.

## Path

```text
third_party/pacto-gov
```

## Clone / update

After cloning Pacto:

```bash
git submodule update --init --recursive
```

Or clone in one step:

```bash
git clone --recurse-submodules <url-for-pacto>
```

To pull upstream contract changes **after** intentional bump:

```bash
cd third_party/pacto-gov
git fetch origin
git checkout <reviewed-commit-or-tag>
cd ../..
git add third_party/pacto-gov
git commit -m "Bump pacto-gov submodule to …"
```

Treat bumps like dependency upgrades: review contract diff and release notes before merging.

## Current pin

Superproject records the submodule **gitlink** (commit SHA). As of the submodule’s introduction, `third_party/pacto-gov` tracks **`dev`** at commit **`54d4065f0fc3a16c29da2ecebc663130d206fd86`** (update this line when the pin changes).

Design notes: [`ai-docs/gov-core/GOVERNANCE_LIBRARY_OUTLINE.md`](../../ai-docs/gov-core/GOVERNANCE_LIBRARY_OUTLINE.md), [`ai-docs/gov-core/GOVERNANCE_LIBRARY_TECH_SPEC.md`](../../ai-docs/gov-core/GOVERNANCE_LIBRARY_TECH_SPEC.md).
