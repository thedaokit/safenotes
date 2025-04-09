import {
    type SafeItem,
    type TransferItem,
    type TransferCategoryItem,
    type CategoryItem,
} from '@/db/schema'
import Papa from 'papaparse'
import { format } from 'date-fns'

export interface TransferTableItem extends TransferItem {
    viewType: 'in' | 'out'
}

export function transfersToTableFormat(transfers: TransferItem[], safeAddress: string | null, allSafes: SafeItem[]): TransferTableItem[] {
    return transfers
        .filter((transfer) => {
            const decimals = transfer.tokenDecimals || 18
            const value = Number(transfer.value) / Math.pow(10, decimals)
            return value >= 0.99 // threshold to show transfers
        })
        .flatMap((transfer) => {
            const rows: TransferTableItem[] = []
            const trackedSafeAddresses = safeAddress
                ? new Set([safeAddress.toLowerCase()])
                : new Set(allSafes.map((safe) => safe.address.toLowerCase()))

            // Check if from address is a tracked safe
            if (trackedSafeAddresses.has(transfer.fromAddress.toLowerCase())) {
                rows.push({
                    ...transfer,
                    viewType: 'out',
                })
            }

            // Check if to address is a tracked safe
            if (trackedSafeAddresses.has(transfer.toAddress.toLowerCase())) {
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
