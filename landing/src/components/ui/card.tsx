import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'ghost'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-500',
        variant === 'default' && 'glass-card',
        variant === 'elevated' && 'glass-card-elevated',
        variant === 'ghost' && 'border border-transparent hover:border-border/40',
        className
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

export { Card, CardContent }
