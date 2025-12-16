import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
  error?: string | null
  className?: string
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-destructive mt-1', className)}>
      <AlertCircle className="h-3 w-3" />
      <span>{error}</span>
    </div>
  )
}
