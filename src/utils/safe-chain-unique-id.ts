import { SelectedSafe, Chain} from '@/db/schema'
/**
 * Creates a unique identifier by combining a safe address and chain
 * @param address The safe address
 * @param chain The blockchain chain identifier
 * @returns A unique string combining both values
 */
export function createSafeChainUniqueId(address: string, chain: string): string {
  return `${address.toLowerCase()}_${chain.toLowerCase()}`;
}

/**
 * Parses a safe chain unique ID back into its components
 * @param uniqueId The combined unique identifier
 * @returns An object containing the address and chain
 */
export function parseSafeChainUniqueId(uniqueId: string): SelectedSafe {
  const [address, chain] = uniqueId.split('_');
  // Convert chain string to uppercase to match enum values
  const chainEnum = chain.toUpperCase() as Chain;
  return { address, chain: chainEnum };
}