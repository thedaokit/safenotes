import { Chain } from '@/db/schema'

export const BLOCK_EXPLORER_URLS: Record<Chain, string> = {
  'ETH': 'https://etherscan.io',  // Ethereum Mainnet
  'ARB': 'https://arbiscan.io',   // Arbitrum
  'UNI': 'https://uniswap.org',   // Uniswap
  'BASE': 'https://basescan.org', // Base
  'LINEA': 'https://lineascan.build', // Linea
  'OP': 'https://optimistic.etherscan.io', // Optimism
  'SCROLL': 'https://scrollscan.com', // Scroll
}

export function getBlockExplorerUrl(chain: Chain): string {
  return BLOCK_EXPLORER_URLS[chain]
}

export function getAddressUrl(chain: Chain, address: string): string {
  return `${getBlockExplorerUrl(chain)}/address/${address}`
}

export function getTransactionUrl(chain: Chain, txHash: string): string {
  return `${getBlockExplorerUrl(chain)}/tx/${txHash}`
}
