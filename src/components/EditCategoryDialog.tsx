import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryItem } from '@/db/schema'
import { api } from '@/utils/trpc'

interface EditCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  transferId: string
  currentCategoryId: string | null
  currentDescription: string
  categories: CategoryItem[]
  safeName?: string
  safeAddress: string
  transactionHash: string
}

export function EditCategoryDialog({
  isOpen,
  onClose,
  transferId,
  currentCategoryId,
  currentDescription,
  categories,
  safeName,
  safeAddress,
  transactionHash,
}: EditCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    currentCategoryId
  )
  const [description, setDescription] = useState(currentDescription)
  const [showValidationError, setShowValidationError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = api.useUtils()

  // Update selected category and description when props change or dialog opens
  useEffect(() => {
    setSelectedCategory(currentCategoryId)
    setDescription(currentDescription)
    setShowValidationError(false)
    setIsSubmitting(false)
  }, [currentCategoryId, currentDescription, isOpen])

  const { mutate: updateCategory } = api.transfers.updateCategory.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transfers.getTransfers.invalidate(),
        utils.categories.getAllTransferCategories.invalidate(),
      ])
      toast.success('Category updated successfully')
      onClose()
      setIsSubmitting(false)
    },
    onError: (error) => {
      toast.error(`Error updating category: ${error.message}`)
      setIsSubmitting(false)
    }
  })

  const handleSave = async () => {
    if (!selectedCategory) {
      setShowValidationError(true)
      return
    }
    
    setIsSubmitting(true)
    try {
      await updateCategory({
        transferId,
        categoryId: selectedCategory,
        description: description.trim() || null,
      })
    } catch (error) {
      // This is a fallback error handler, though the error should be caught by the onError callback
      setIsSubmitting(false)
      toast.error('An unexpected error occurred')
      console.error('Update category error:', error)
    }
  }

  const handleValueChange = (value: string) => {
    setSelectedCategory(value === 'none' ? null : value)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Check if we should show a warning about missing category while typing description
  const showCategoryWarning = !selectedCategory && description.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>
              Safe:{' '}
              {safeName
                ? `${safeName} (${formatAddress(safeAddress)})`
                : formatAddress(safeAddress)}
            </p>
            <p>
              Transaction:{' '}
              <a
                href={`https://etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                {formatAddress(transactionHash)}
              </a>
            </p>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedCategory || 'none'}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className={`bg-white ${(showValidationError && !selectedCategory) || showCategoryWarning ? 'border-red-500 ring-red-200' : ''}`}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showValidationError && !selectedCategory && (
              <p className="text-sm text-red-500">Please select a category</p>
            )}
            {showCategoryWarning && !showValidationError && (
              <p className="text-sm text-amber-600">
                <span className="inline-block mr-1">⚠️</span>
                Must select a category to save this description
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border p-2"
              placeholder="Add a description (optional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <div className="flex flex-col w-full gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
              disabled={!selectedCategory || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
