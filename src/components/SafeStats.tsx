import { useQuery } from '@tanstack/react-query'
import { Users, Wallet } from 'lucide-react'
import { Address, getAddress } from 'viem'
import { useState } from 'react'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { SelectedSafe } from '@/db/schema'
import { publicClient } from '@/lib/web3'
import { getSafeApiUrl, SAFE_API_URL_BASE_SUBPATH } from '@/utils/safe-global-adapter'

interface Token {
  name: string
  symbol: string
  decimals: number
  logoUri: string
}

interface Balance {
  tokenAddress: string | null
  token: Token | null
  balance: string
}

interface SafeInfo {
  owners: string[]
  threshold: number
}

interface SafeStatsProps {
  selectedSafe: SelectedSafe | null
}

export const SafeStats = ({ selectedSafe }: SafeStatsProps) => {
  const [isSignersOpen, setIsSignersOpen] = useState(false)
  const [isBalanceOpen, setIsBalanceOpen] = useState(false)

  const { data: signersData } = useQuery({
    queryKey: ['safe-info', selectedSafe],
    queryFn: async () => {
      if (!selectedSafe) return null
      const normalizedSafeAddress = getAddress(selectedSafe.address)
      const safeApiUrl = new URL(
        `${SAFE_API_URL_BASE_SUBPATH}/safes/${normalizedSafeAddress}/`,
        getSafeApiUrl(selectedSafe.chain)
      )

      const response = await fetch(safeApiUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch safe info')
      }

      return (await response.json()) as SafeInfo
    },
    enabled: !!selectedSafe,
  })

  const { data: balances } = useQuery({
    queryKey: ['safe-balances', selectedSafe],
    queryFn: async () => {
      if (!selectedSafe) return null
      const normalizedSafeAddress = getAddress(selectedSafe.address)
      const safeApiUrl = new URL(
        `${SAFE_API_URL_BASE_SUBPATH}/safes/${normalizedSafeAddress}/balances/`,
        getSafeApiUrl(selectedSafe.chain)
      )
      safeApiUrl.searchParams.set('trusted', 'true')
      safeApiUrl.searchParams.set('exclude_spam', 'true')

      const response = await fetch(safeApiUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch safe balances')
      }

      return (await response.json()) as Balance[]
    },
    enabled: !!selectedSafe,
  })

  const { data: ensNames, isLoading: isEnsNamesLoading } = useQuery({
    queryKey: ['safe-signers-ens', signersData?.owners],
    queryFn: async () => {
      if (!signersData) return []

      const names = await Promise.all(
        signersData.owners
          .map((address: string) => getAddress(address))
          .map(async (address: string) => {
            const name = await publicClient.getEnsName({
              address: address as Address,
            })

            let avatar = null
            if (name) {
              try {
                avatar = await publicClient.getEnsAvatar({ name })
              } catch (error) {
                console.error('Failed to fetch ENS avatar:', error)
              }
            }

            return {
              address,
              name,
              avatar,
            }
          })
      )

      return names
    },
    enabled: !!signersData?.owners,
  })

  if (!selectedSafe) return null

  return (
    <div className="flex flex-row items-start gap-4 sm:items-center">
      <HoverCard 
        openDelay={200} 
        closeDelay={300} 
        open={isSignersOpen} 
        onOpenChange={setIsSignersOpen}
      >
        <HoverCardTrigger 
          asChild
          onClick={() => setIsSignersOpen(!isSignersOpen)}
        >
          <div className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-4 py-2 pr-8">
            <Users size={24} className="text-neutral-700" />
            <span className="text-sm text-neutral-900">Signers</span>
            <span className="">
              ({signersData?.threshold || 0}/{signersData?.owners?.length || 0})
            </span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[300px]" align="start" sideOffset={4}>
          <div className="space-y-2">
            <h3 className="font-semibold">Signers</h3>
            <ul className="space-y-2">
              {isEnsNamesLoading
                ? // Loading skeletons
                Array.from({ length: signersData?.owners?.length || 3 }).map(
                  (_, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <div className="mr-2 h-6 w-6 animate-pulse rounded-full bg-neutral-200"></div>
                      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200"></div>
                    </li>
                  )
                )
                : ensNames?.map(({ address, name, avatar }) => (
                  <li key={address} className="flex items-center text-sm">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt={name || address}
                        className="mr-2 rounded-full"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <div className="mr-2 h-6 w-6 rounded-full bg-brand"></div>
                    )}{' '}
                    {name || `${address.slice(0, 6)}...${address.slice(-4)}`}
                  </li>
                ))}
            </ul>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard 
        openDelay={200} 
        closeDelay={300} 
        open={isBalanceOpen} 
        onOpenChange={setIsBalanceOpen}
      >
        <HoverCardTrigger 
          asChild
          onClick={() => setIsBalanceOpen(!isBalanceOpen)}
        >
          <div className="inline-flex cursor-pointer items-center justify-between gap-2 rounded-md border border-neutral-200 px-4 py-2">
            <Wallet size={24} className="text-neutral-700" />
            <span className="text-sm"> Balance</span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[300px]" align="start" sideOffset={4}>
          <div className="space-y-2">
            <h3 className="font-semibold">Balance Details</h3>
            <ul className="space-y-1">
              {balances?.map((balance) => (
                <li
                  key={balance.tokenAddress || 'eth'}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{balance.token?.symbol || 'ETH'}</span>
                  <span>
                    {(
                      Number(balance.balance) /
                      Math.pow(10, balance.token?.decimals || 18)
                    ).toLocaleString(undefined, {
                      minimumFractionDigits:
                        balance.token?.symbol === 'ETH' ||
                          balance.token?.symbol === 'WETH'
                          ? 1
                          : 0,
                      maximumFractionDigits:
                        balance.token?.symbol === 'ETH' ||
                          balance.token?.symbol === 'WETH'
                          ? 1
                          : 0,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
