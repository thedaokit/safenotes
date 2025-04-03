import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { chainEnum } from '@/db/schema'

type Chain = typeof chainEnum.enumValues[number]

interface NewSafeDialogProps {
  /**
   * Function to call when a new safe is added
   */
  onAddSafe: (address: string, chain: Chain) => void
  
  /**
   * Whether the add operation is currently loading
   */
  isLoading?: boolean
}

export function NewSafeDialog({ onAddSafe, isLoading = false }: NewSafeDialogProps) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState<Chain>('ETH')
  const [error, setError] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Basic validation for Ethereum address format
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address.trim())
    
    if (!address.trim()) {
      setError('Safe address cannot be empty')
      return
    }
    
    if (!isValidAddress) {
      setError('Invalid Ethereum address format')
      return
    }
    
    // Call the parent component's function
    onAddSafe(address.trim(), chain)
    
    // Reset form and close dialog
    setAddress('')
    setChain('ETH')
    setOpen(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Add New Safe</DialogTitle>
          <DialogDescription>
            Enter the Ethereum address of the Safe wallet you want to add.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="address">Safe Address</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={error ? 'border-red-500' : ''}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chain">Chain</Label>
              <Select value={chain} onValueChange={(value: Chain) => setChain(value)}>
                <SelectTrigger id="chain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">Ethereum</SelectItem>
                  <SelectItem value="ARB">Arbitrum</SelectItem>
                  <SelectItem value="UNI">Uniswap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLoading ? 'Adding...' : 'Add Safe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 