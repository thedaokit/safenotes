import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/utils/trpc'
import { Badge } from '@/components/ui/badge'
import { chainEnum } from '@/db/schema'

interface SafeSelectorProps {
  safeAddress: string | null
  chain: Chain
  onChange: (value: string | null, chain: Chain) => void
  organizationId?: string // Optional organization ID parameter
}

type Chain = typeof chainEnum.enumValues[number]

export default function SafeSelector({
  safeAddress,
  chain,
  onChange,
  organizationId,
}: SafeSelectorProps) {
  // Fetch all safes with ENS (used when no organizationId is provided)
  const { data: allSafesWithEns, isLoading: allSafesLoading } = api.safes.getAllSafesWithEns.useQuery(
    undefined,
    { enabled: !organizationId }
  )
  // Fetch safes for a specific organization
  const { data: orgSafes, isLoading: orgSafesLoading } = api.safes.getByOrganization.useQuery(
    { organizationId: organizationId || '' },
    { enabled: !!organizationId }
  )

  // Fetch ENS names for organization safes if needed
  const { data: orgSafesWithEns, isLoading: orgEnsLoading } = api.safes.getAllSafesWithEns.useQuery(
    undefined,
    {
      enabled: !!organizationId && !!orgSafes,
      select: (allSafes) => {
        // Filter to only include safes from our organization
        return allSafes.filter(safe => 
          orgSafes?.some(orgSafe => orgSafe.address === safe.address)
        )
      }
    }
  )

  // Determine which data and loading state to use
  const safes = organizationId ? orgSafesWithEns : allSafesWithEns
  const isLoading = organizationId
    ? (orgSafesLoading || orgEnsLoading)
    : allSafesLoading

  const localHandleChange = (value: string) => {
    const [safeAddress, chain] = value.split('-')
    // Convert "all" back to null when selected
    onChange(safeAddress === 'all' ? null : safeAddress, chain as Chain)
  }

  const getChainDisplayName = (chain: string) => {
    switch (chain) {
      case 'ETH':
        return 'Ethereum'
      case 'ARB':
        return 'Arbitrum'
      case 'UNI':
        return 'Uniswap'
      default:
        return chain
    }
  }

  return (
    <div className="flex flex-col gap-2">
    <Select
      value={safeAddress === null ? 'all' : `${safeAddress}-${chain}`}
      onValueChange={localHandleChange}
    >
      <SelectTrigger className="min-w-[300px] max-w-[367px] bg-neutral-50 py-5 text-lg font-bold">
        <SelectValue placeholder="All Safes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Safes</SelectItem>
        {isLoading && (
          <SelectItem value="loading" disabled>
            Loading safes...
          </SelectItem>
        )}
        {safes?.map((safe) => (
          <SelectItem key={`${safe.address}-${safe.chain}`} value={`${safe.address}-${safe.chain}`}>
            <div className="flex items-center gap-2">
              <span>
                {safe.name
                  ? safe.name
                  : `${safe.address.slice(0, 6)}...${safe.address.slice(-4)}`}
              </span>
              <Badge variant="outline" className="text-xs">
                {getChainDisplayName(safe.chain)}
              </Badge>
            </div>
          </SelectItem>
        ))}
        {safes?.length === 0 && (
          <SelectItem value="empty" disabled>
            No safes found
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  </div>
  )
}
