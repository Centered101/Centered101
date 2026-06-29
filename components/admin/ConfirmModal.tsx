'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#27272A] bg-[#18181B] text-[#FAFAFA] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[#A1A1AA]">{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="border-[#27272A] bg-transparent text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            className={
              destructive
                ? 'bg-[#EF4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#409EFE] text-white hover:bg-[#60aeff]'
            }
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
