import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { transferCategories, transfers, chainEnum } from '@/db/schema'
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc'
import {
  fetchSafeTransfers,
  filterTrustedTransfers,
} from '@/utils/safe-global-adapter'
import { TRPCError } from '@trpc/server'

const safeTransferSchema = z.object({
  transferId: z.string(),
  safeAddress: z.string(),
  safeChain: z.enum(chainEnum.enumValues),
  type: z.enum(['ETHER_TRANSFER', 'ERC20_TRANSFER']),
  executionDate: z.string(),
  blockNumber: z.number(),
  transactionHash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  tokenAddress: z.string().nullable(),
  tokenInfo: z
    .object({
      name: z.string(),
      symbol: z.string(),
      decimals: z.number(),
      logoUri: z.string().optional(),
      trusted: z.boolean(),
    })
    .nullable(),
})

export const transfersRouter = createTRPCRouter({
  getTransfersPerWallet: publicProcedure
    .input(
      z.object({
        safeAddress: z.string(),
        chain: z.enum(chainEnum.enumValues),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const { results } = await fetchSafeTransfers(
        input.safeAddress,
        input.chain,
        input.limit
      )
      return filterTrustedTransfers(results)
    }),
  writeTransfer: publicProcedure
    .input(
      z.object({
        transfer: safeTransferSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { transfer } = input

      await ctx.db
        .insert(transfers)
        .values({
          transferId: transfer.transferId,
          safeAddress: transfer.safeAddress,
          safeChain: transfer.safeChain,
          type: transfer.type,
          executionDate: new Date(transfer.executionDate),
          blockNumber: transfer.blockNumber,
          transactionHash: transfer.transactionHash,
          fromAddress: transfer.from,
          toAddress: transfer.to,
          value: transfer.value,
          tokenAddress: transfer.tokenAddress,
          tokenName: transfer.tokenInfo?.name ?? null,
          tokenSymbol: transfer.tokenInfo?.symbol ?? null,
          tokenDecimals: transfer.tokenInfo?.decimals ?? null,
          tokenLogoUri: transfer.tokenInfo?.logoUri ?? null,
          createdAt: new Date(),
        })
        .onConflictDoNothing()

      return { success: true }
    }),
  getTransfers: publicProcedure
    .input(
      z.object({
        safeAddress: z.string().optional(),
        chain: z.enum(chainEnum.enumValues).optional(),
      }).refine((data) => {
        // Either both parameters are provided or neither is provided
        return (data.safeAddress && data.chain) || (!data.safeAddress && !data.chain)
      }, {
        message: "Both safeAddress and chain must be provided together, or neither should be provided"
      })
    )
    .query(async ({ ctx, input }) => {
      const query = ctx.db
        .select()
        .from(transfers)
        .orderBy(desc(transfers.executionDate))

      if (input.safeAddress && input.chain) {
        const address = input.safeAddress.toLowerCase()
        query.where(
          sql`LOWER(${transfers.fromAddress}) = ${address} OR LOWER(${transfers.toAddress}) = ${address}`
        )
        query.where(eq(transfers.safeChain, input.chain))
      }

      return query
    }),
  updateCategory: protectedProcedure
    .input(
      z.object({
        transferId: z.string(),
        categoryId: z.string().nullable(),
        description: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First delete any existing category mapping
      await ctx.db
        .delete(transferCategories)
        .where(eq(transferCategories.transferId, input.transferId))

      // If a new category is selected, create the mapping
      if (input.categoryId) {
        await ctx.db.insert(transferCategories).values({
          transferId: input.transferId,
          categoryId: input.categoryId,
          description: input.description,
        })
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category is required',
        })
      }

      return { success: true }
    }),
})
