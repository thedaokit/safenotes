import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/utils/trpc'
import { ChainIcon } from '@/components/ChainIcon'
import { createSafeChainUniqueId, parseSafeChainUniqueId } from '@/utils/safe-chain-unique-id'
import { SelectedSafe } from '@/db/schema'


interface SafeSelectorProps {
  selectedSafe: SelectedSafe | null
  onChange: (value: SelectedSafe | null) => void
  organizationId?: string // Optional organization ID parameter
}

export default function SafeSelector({
  selectedSafe,
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

  const handleChange = (value: string) => {
    // Convert "all" back to null when selected
    onChange(value === 'all' ? null : parseSafeChainUniqueId(value))
  }

  return (
    <Select
      value={selectedSafe === null ? 'all' : createSafeChainUniqueId(selectedSafe.address, selectedSafe.chain)}
      onValueChange={handleChange}
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
          <SelectItem key={createSafeChainUniqueId(safe.address, safe.chain)} value={createSafeChainUniqueId(safe.address, safe.chain)}>
            <div className="flex items-center gap-2">
              <ChainIcon chain={safe.chain} width={24} height={24} />
              {safe.name
                ? safe.name
                : `${safe.address.slice(0, 6)}...${safe.address.slice(-4)}`}
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
  )
}
