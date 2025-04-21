import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout';
import { api } from '@/utils/trpc';
import Image from 'next/image'
import { Download, RefreshCw } from 'lucide-react'

import { useState, useEffect } from 'react';
import SafeSelector from '@/components/SafeSelector'
import { useSession } from 'next-auth/react'
import { TableSkeleton } from '@/components/TableSkeleton'
import { SafeStats } from '@/components/SafeStats'
import { adminAddresses } from '@/lib/auth'
import { SyncTransactionsDialog } from '@/components/SyncTransactionsDialog'
import TransactionTable from '@/components/TransactionTable';
import { Button } from '@/components/ui/button';
import { transfersToCsvFormat, transfersToTableFormat } from '@/utils/transfers-to-table-format';
import {SelectedSafe} from '@/db/schema'

export default function OrganizationPage() {
  const router = useRouter();
  const { org } = router.query;
  const [selectedSafe, setSelectedSafe] = useState<SelectedSafe | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: session } = useSession();

  const { data: organization } = api.organizations.getBySlug.useQuery(
    { slug: org as string },
    { enabled: !!org }
  );

  const { data: safes } = api.safes.getByOrganization.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );

  // Get all transactions for this organization's safes
  const { data: transfers, isLoading: transfersLoading, error: transfersError } = api.transfers.getTransfers.useQuery(
    { safeAddress: selectedSafe?.address, chain: selectedSafe?.chain },
    { enabled: !!safes?.length }
  );

  const {
    data: transferCategories,
    isLoading: transferCategoriesLoading,
    error: transferCategoriesError,
  } = api.categories.getAllTransferCategories.useQuery();

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = api.categories.getCategoriesByOrganization.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization?.id }
  );

  // Fetch organization admins to check if current user is an admin
  const { data: admins, isLoading: adminsLoading, error: adminsError } = api.admin.getOrgAdmins.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization?.id }
  );

  // Determine if the current user is an admin for this organization
  useEffect(() => {
    const isSuperAdmin = adminAddresses.includes(session?.user?.name || '');
    if (isSuperAdmin) {
      setIsAdmin(true);
      return;
    }

    if (!admins) {
      return;
    }

    if (admins && session?.user?.name) {
      const userWalletAddress = session.user.name.toLowerCase();
      const isOrgAdmin = admins.some(
        (admin: { walletAddress: string }) => admin.walletAddress.toLowerCase() === userWalletAddress
      );
      setIsAdmin(isOrgAdmin);
    }
  }, [admins, session]);

  const handleExportCsv = () => {
    if (!transfers || !organization) return

    // Process transfers to match the table view
    const processedTransfers = transfersToTableFormat(transfers, selectedSafe, safes || [])
    const csv = transfersToCsvFormat(processedTransfers, transferCategories || [], categories || [])


    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${organization.name.toLowerCase()}_transactions_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const isLoading = transfersLoading || transferCategoriesLoading || categoriesLoading || adminsLoading;
  const isError = transfersError || transferCategoriesError || categoriesError || adminsError;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold">{organization?.name}</h1>
            <div className="text-neutral-500">{organization?.description}</div>
          </div>
          <div className="flex flex-col items-end gap-3">
          {organization?.logoImage && (
              <Image
                src={organization.logoImage}
                alt={`${organization?.name} Logo`}
                className="h-20 w-20 -rotate-3 rounded-2xl drop-shadow-md"
                width={80}
                height={80}
              />
            )}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4">
            <SafeSelector
              selectedSafe={selectedSafe}
              onChange={setSelectedSafe}
              organizationId={organization?.id ?? ''}
            />
            <SafeStats selectedSafe={selectedSafe} />
          </div>
          {/* Sync button above transaction table */}
          {isAdmin && (
            <div className="flex justify-center gap-2 md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSyncDialogOpen(true)}
                className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Transactions
              </Button>
            </div>
          )}
        </div>



        {isLoading ? (
          <TableSkeleton isAdmin={isAdmin} />
        ) : transfers ? (
          <TransactionTable
            transfers={transfers}
            transferCategories={transferCategories || []}
            categories={categories || []}
            selectedSafe={selectedSafe}
            isLoading={isLoading}
            allSafes={safes || []}
            isAdmin={isAdmin}
          />
        ) : null}
        {isError && <div> transfers error </div>}
        <SyncTransactionsDialog
          isOpen={isSyncDialogOpen}
          onClose={() => setIsSyncDialogOpen(false)}
          organizationId={organization?.id ?? ''}
        />
      </div>
    </Layout>
  );
} 