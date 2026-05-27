/// <reference types="vite/client" />

/**
 * Optional overrides for embedded-wallet JSON-RPC endpoints.
 * Set in `.env` (see `.env.example`). Comma-separated URLs = primary first, then fallbacks.
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_WALLET_RPC_ARBITRUM?: string;
  readonly VITE_WALLET_RPC_MAINNET?: string;
  readonly VITE_WALLET_RPC_OPTIMISM?: string;
  readonly VITE_WALLET_RPC_SEPOLIA?: string;
  readonly VITE_WALLET_RPC_DOCS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
