import {
    SelectedSafe,
    type SafeItem,
    type TransferItem,
    type TransferCategoryItem,
    type CategoryItem,
} from '@/db/schema'
import Papa from 'papaparse'
import { format } from 'date-fns'
import { createSafeChainUniqueId } from '@/utils/safe-chain-unique-id'

export interface TransferTableItem extends TransferItem {
    viewType: 'in' | 'out'
}

export function transfersToTableFormat(transfers: TransferItem[], selectedSafe: SelectedSafe | null, allSafes: SafeItem[]): TransferTableItem[] {
    return transfers
        .filter((transfer) => {
            const decimals = transfer.tokenDecimals || 18
            const value = Number(transfer.value) / Math.pow(10, decimals)
            return value >= 0.99 // threshold to show transfers
        })
        .flatMap((transfer) => {
            const rows: TransferTableItem[] = []
            const trackedSafeAddresses = selectedSafe
                ? new Set([createSafeChainUniqueId(selectedSafe.address, selectedSafe.chain)])
                : new Set(allSafes.map((safe) => createSafeChainUniqueId(safe.address, safe.chain)))

            const identifierOut = createSafeChainUniqueId(transfer.fromAddress, transfer.safeChain)
            const identifierIn = createSafeChainUniqueId(transfer.toAddress, transfer.safeChain)
            // Check if from address is a tracked safe
            if (trackedSafeAddresses.has(identifierOut)) {
                rows.push({
                    ...transfer,
                    viewType: 'out',
                })
            }

            // Check if to address is a tracked safe
            if (trackedSafeAddresses.has(identifierIn)) {
                rows.push({
                    ...transfer,
                    viewType: 'in',
                })
            }

            return rows
        })
}

export function transfersToCsvFormat(processedTransfers: TransferTableItem[], transferCategories: TransferCategoryItem[], categories: CategoryItem[]) {
    return Papa.unparse(
        processedTransfers.map((transfer) => {
          const decimals = transfer.tokenDecimals || 18
          const value =
            Number(transfer.value) / Math.pow(10, decimals)
          const formattedAmount =
            transfer.tokenSymbol === 'ETH' ||
            transfer.tokenSymbol === 'WETH' ||
            !transfer.tokenSymbol
              ? `${value.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} ${transfer.tokenSymbol || 'ETH'}`
              : `${value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} ${transfer.tokenSymbol}`

          // Find category info
          const transferCategory = transferCategories?.find(
            (tc) => tc.transferId === transfer.transferId
          )
          const category = categories?.find(
            (c) => c.id === transferCategory?.categoryId
          )

          const isOutgoing = transfer.viewType === 'out'
          const mainPartyAddress = isOutgoing
            ? transfer.fromAddress
            : transfer.toAddress
          const counterpartyAddress = isOutgoing
            ? transfer.toAddress
            : transfer.fromAddress

          return {
            Date: format(
              new Date(transfer.executionDate),
              'MMM d, yyyy'
            ),
            Safe: mainPartyAddress,
            Amount: (isOutgoing ? '-' : '+') + formattedAmount,
            'To/From': counterpartyAddress,
            Category: category?.name || 'None',
            Description: transferCategory?.description || '-',
          }
        })
      )
}
