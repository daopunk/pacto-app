/**
 * Embedded wallet: chain config, public client, and read-only account access.
 * Signing is done in the backend via Tauri (no private key in frontend).
 */

export {
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,
  getChainConfig,
  getEffectiveRpcUrlsForChain,
  createWalletPublicClient,
  type SupportedChainId,
} from './chains';

export { getCurrentAddress, getPublicClient, getBalance } from './client';
export {
  getWalletSummary,
  walletBuildAndSendTransaction,
  type WalletSummary,
  type WalletSummaryResult,
  type WalletSummaryNetwork,
  type WalletSummaryAsset,
  type WalletSendResult,
  type WalletSendResultOutcome,
  type WalletOpParsedError,
  type WalletTransferSuccessDetail,
} from './backend-wallet';
export { getSafeState, type SafeState } from './safe';
export {
  getWalletUsdSpotPrices,
  amountToApproxUsd,
  formatApproxUsd,
  type WalletUsdSpotPrices,
  type WalletUsdSpotPricesResult,
} from './pricing';
export {
  WALLET_ASSETS,
  WALLET_ASSETS_CHAIN_IDS,
  getWalletAssetsForChain,
  getWalletNetworkDisplayName,
  getExplorerTxUrl,
  listWalletAssetOptionsForChain,
  type WalletAssetCode,
  type WalletStablecoin,
  type WalletAssetsFile,
  type WalletNetworkAssets,
} from './assets';

export {
  WALLET_TX_REQUEST_WIRE_TYPE,
  WALLET_TX_ANNOUNCEMENT_WIRE_TYPE,
  parseWalletTxRequest,
  parseWalletTxAnnouncement,
  formatWalletTxRequest,
  formatWalletTxAnnouncement,
  getFulfilledWalletRequestIdsFromMessages,
  type WalletTxRequestPayload,
  type WalletTxAnnouncementPayload,
} from './dm-messages';
