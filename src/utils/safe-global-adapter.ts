import { getAddress } from 'viem'
import { Chain } from '@/db/schema'

export const SAFE_API_URL_BASE_SUBPATH = '/api/v1'

// Map of chain IDs to Safe Transaction Service API URLs
const SAFE_API_URLS: Record<Chain, string> = {
  'ETH': 'https://safe-transaction-mainnet.safe.global',  // Ethereum Mainnet
  'ARB': 'https://safe-transaction-arbitrum.safe.global', // Arbitrum
  'UNI': 'https://safe-transaction-uni.safe.global',      // Uni
  'BASE': 'https://safe-transaction-base.safe.global', // Base
  'LINEA': 'https://safe-transaction-linea.safe.global', // Linea
  'OP': 'https://safe-transaction-optimism.safe.global', // Optimism
  'SCROLL': 'https://safe-transaction-scroll.safe.global', // Scroll
}

export function getSafeApiUrl(chain: Chain): string {
  return SAFE_API_URLS[chain]
}

export function getSafeApiUrlWithSubpath(chain: Chain): string {
  return `${getSafeApiUrl(chain)}${SAFE_API_URL_BASE_SUBPATH}`
}

export interface SafeTransferResponse {
  count: number
  results: SafeTransfer[]
}

export interface SafeTransfer {
  safeAddress: string
  safeChain: Chain
  type: 'ETHER_TRANSFER' | 'ERC20_TRANSFER'
  executionDate: string
  blockNumber: number
  transactionHash: string
  transferId: string
  to: string
  from: string
  tokenId: string | null
  value: string
  tokenAddress: string | null
  tokenInfo: {
    type: string
    address: string
    name: string
    symbol: string
    decimals: number
    logoUri?: string
    trusted: boolean
  } | null
}

export async function fetchSafeTransfers(
  safeAddress: string,
  chain: Chain,
  limit: number = 100
): Promise<SafeTransferResponse> {
  const checksummedSafeAddress = getAddress(safeAddress)
  const apiUrl = `${getSafeApiUrlWithSubpath(chain)}/safes/${checksummedSafeAddress}/transfers/?limit=${limit}`
  const response = await fetch(apiUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch transfers for safe ${safeAddress}`)
  }
  const data = await response.json()
  const transfers = data.results.map((transfer: SafeTransfer) => ({
    ...transfer,
    safeAddress,
    safeChain: chain,
  }))

  return {
    count: transfers.length,
    results: transfers,
  }
}

export function filterTrustedTransfers(
  transfers: SafeTransfer[]
): SafeTransfer[] {
  return transfers.filter((transfer) => {
    if (!transfer.tokenInfo) return true
    return transfer.tokenInfo.trusted === true
  })
}
