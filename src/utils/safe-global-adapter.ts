import { getAddress } from 'viem'
import { Chain } from '@/db/schema'

export const SAFE_API_URL_BASE = 'https://api.safe.global/tx-service/'
export const SAFE_API_V1 = '/api/v1'
export const SAFE_API_V2 = '/api/v2'

// Map of chain IDs to Safe Transaction Service API URLs
export const SAFE_API_CHAIN_PATHS: Record<Chain, string> = {
  'ETH': 'eth',  // Ethereum Mainnet
  'ARB': 'arb1', // Arbitrum
  'UNI': 'unichain',      // Uni
  'BASE': 'base', // Base
  'LINEA': 'linea', // Linea
  'OP': 'oeth', // Optimism
  'SCROLL': 'scr', // Scroll
}

export function getSafeApiUrl(chain: Chain): string {
  return `${SAFE_API_URL_BASE}${SAFE_API_CHAIN_PATHS[chain]}`
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

export function getSafeApiKey(): string {
  const safeApiKey = process.env.SAFE_API_KEY || ''
  if (!safeApiKey) {
    throw new Error('SAFE_API_KEY is not set')
  }
  return safeApiKey
}

export async function fetchSafeTransfers(
  safeAddress: string,
  chain: Chain,
  limit: number = 100
): Promise<SafeTransferResponse> {
  const checksummedSafeAddress = getAddress(safeAddress)
  const apiUrl = `${getSafeApiUrl(chain)}${SAFE_API_V1}/safes/${checksummedSafeAddress}/transfers/?limit=${limit}`
  const safeApiKey = getSafeApiKey()
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${safeApiKey}`,
    },
  })

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
