import { eq, and } from 'drizzle-orm'
import { Address, getAddress } from 'viem'
import { z } from 'zod'

import {
  getSafeApiUrl,
  SAFE_API_V1,
  SAFE_API_V2,
  getSafeApiKey
} from '@/utils/safe-global-adapter'
import { safes, chainEnum } from '@/db/schema'
import { publicClient } from '@/lib/web3'
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure
} from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'

interface SafeInfo {
  owners: string[]
  threshold: number
}

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

export const safesRouter = createTRPCRouter({
  getAllSafes: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(safes)
  }),

  getAllSafesWithEns: publicProcedure.query(async ({ ctx }) => {
    const safesList = await ctx.db.select().from(safes)

    const safesWithEns = await Promise.all(
      safesList.map(async (safe) => {
        const name = await publicClient.getEnsName({
          address: safe.address as Address,
        })

        return {
          ...safe,
          name,
        }
      })
    )

    return safesWithEns
  }),
  create: protectedProcedure
    .input(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nonempty(),
        chain: z.enum(chainEnum.enumValues),
        organizationId: z.string().uuid().nonempty(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the safe already exists in the database
      const existingSafe = await ctx.db.select()
        .from(safes)
        .where(
          and(
            eq(safes.address, input.address),
            eq(safes.organizationId, input.organizationId),
            eq(safes.chain, input.chain)
          )
        )
        .limit(1)

      if (existingSafe.length > 0 && !existingSafe[0].removed) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Safe '${input.address}' already exists for this organization`,
        });
      }

      // If safe exists, restore it instead of creating a new one
      if (existingSafe.length > 0 && existingSafe[0].removed) {
        await ctx.db
          .update(safes)
          .set({
            removed: false,
            removedAt: null,
          })
          .where(
            and(
              eq(safes.address, input.address),
              eq(safes.organizationId, input.organizationId),
              eq(safes.chain, input.chain)
            )
          )
        return ctx.db.select().from(safes)
      }

      // If safe doesn't exist, insert it
      await ctx.db.insert(safes).values({
        address: input.address,
        chain: input.chain,
        organizationId: input.organizationId,
      })

      return ctx.db.select().from(safes)
    }),
  delete: adminProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(safes).where(eq(safes.address, input.address))
      return ctx.db.select().from(safes)
    }),

  softDelete: protectedProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(safes)
        .set({
          removed: true,
          removedAt: new Date(),
        })
        .where(eq(safes.address, input.address))

      return {
        message: 'Safe removed successfully',
      }
    }),

  restore: adminProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(safes)
        .set({
          removed: false,
          removedAt: null,
        })
        .where(eq(safes.address, input.address))

      return {
        message: 'Safe restored successfully',
      }
    }),

  getByOrganization: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.safes.findMany({
        where: and(
          eq(safes.organizationId, input.organizationId),
          eq(safes.removed, false)
        )
      })
    }),
  getByOrganizationWithEns: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const safesList = await ctx.db.query.safes.findMany({
        where: and(eq(safes.organizationId, input.organizationId), eq(safes.removed, false)),
      })

      const safesWithEns = await Promise.all(
        safesList.map(async (safe) => {
          const name = await publicClient.getEnsName({
            address: safe.address as Address,
          })

          return {
            ...safe,
            name,
          }
        })
      )

      return safesWithEns
    }),
  getSafeStatusFromSafeApi: publicProcedure
    .input(z.object({ address: z.string(), chain: z.enum(chainEnum.enumValues) }))
    .query(async ({ input }) => {
      const normalizedSafeAddress = getAddress(input.address)
      const safeApiUrl = `${getSafeApiUrl(input.chain)}${SAFE_API_V1}/safes/${normalizedSafeAddress}/`
      const safeApiKey = getSafeApiKey()
      const response = await fetch(safeApiUrl, {
        headers: {
          'Authorization': `Bearer ${safeApiKey}`,
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch safe info')
      }

      return (await response.json()) as SafeInfo
    }),
  getSafeBalancesFromSafeApi: publicProcedure
    .input(z.object({ address: z.string(), chain: z.enum(chainEnum.enumValues) }))
    .query(async ({ input }) => {
      const normalizedSafeAddress = getAddress(input.address)
      const safeApiUrl = `${getSafeApiUrl(input.chain)}${SAFE_API_V2}/safes/${normalizedSafeAddress}/balances/?trusted=true&exclude_spam=true`
      const safeApiKey = getSafeApiKey()
      const response = await fetch(safeApiUrl, {
        headers: {
          'Authorization': `Bearer ${safeApiKey}`,
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch safe balances')
      }
      const json = await response.json()
      return json.results as Balance[]
    }),
})
