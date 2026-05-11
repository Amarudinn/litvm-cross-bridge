import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export type RouteFilterValue = 'all' | 'liteforge_to_sepolia' | 'sepolia_to_liteforge' | 'liteforge_to_basesepolia' | 'basesepolia_to_liteforge'

interface RouteOption {
  value: RouteFilterValue
  from: string
  fromColor: string
  fromDot: string
  to: string
  toColor: string
  toDot: string
  label: string
}

const routeOptions: RouteOption[] = [
  {
    value: 'all',
    from: 'All',
    fromColor: 'text-foreground',
    fromDot: 'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500',
    to: 'Routes',
    toColor: 'text-muted-foreground',
    toDot: '',
    label: 'All Routes',
  },
  {
    value: 'liteforge_to_sepolia',
    from: 'LiteForge',
    fromColor: 'text-blue-400',
    fromDot: 'bg-blue-400',
    to: 'Sepolia',
    toColor: 'text-purple-400',
    toDot: 'bg-purple-400',
    label: 'LF → Sepolia',
  },
  {
    value: 'sepolia_to_liteforge',
    from: 'Sepolia',
    fromColor: 'text-purple-400',
    fromDot: 'bg-purple-400',
    to: 'LiteForge',
    toColor: 'text-blue-400',
    toDot: 'bg-blue-400',
    label: 'Sepolia → LF',
  },
  {
    value: 'liteforge_to_basesepolia',
    from: 'LiteForge',
    fromColor: 'text-blue-400',
    fromDot: 'bg-blue-400',
    to: 'Base',
    toColor: 'text-sky-400',
    toDot: 'bg-sky-400',
    label: 'LF → Base',
  },
  {
    value: 'basesepolia_to_liteforge',
    from: 'Base',
    fromColor: 'text-sky-400',
    fromDot: 'bg-sky-400',
    to: 'LiteForge',
    toColor: 'text-blue-400',
    toDot: 'bg-blue-400',
    label: 'Base → LF',
  },
]

interface RouteFilterDropdownProps {
  value: RouteFilterValue
  onChange: (value: RouteFilterValue) => void
  className?: string
}

export function RouteFilterDropdown({ value, onChange, className }: RouteFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = routeOptions.find((o) => o.value === value) ?? routeOptions[0]

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        id="route-filter-dropdown"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
          'bg-muted/40 border border-border/50 hover:border-primary/40 hover:bg-muted/60',
          'shadow-sm hover:shadow-md hover:shadow-primary/5',
          open && 'border-primary/50 bg-muted/60 shadow-md shadow-primary/10'
        )}
      >
        {/* Label */}
        <span className="flex items-center gap-1">
          {selected.value === 'all' ? (
            <span className="text-foreground">All Routes</span>
          ) : (
            <>
              <span className={selected.fromColor}>{selected.from}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/70 mx-0.5" />
              <span className={selected.toColor}>{selected.to}</span>
            </>
          )}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200 ml-auto',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute top-full left-0 mt-2 z-50 min-w-[240px]',
              'rounded-xl border border-border/60',
              'bg-card/95 backdrop-blur-xl',
              'shadow-2xl shadow-black/20',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Layers className="h-3 w-3" />
                Filter by Route
              </div>
            </div>

            {/* Options */}
            <div className="p-1.5">
              {routeOptions.map((option) => {
                const isSelected = value === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                      isSelected
                        ? 'bg-primary/12 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {/* Route label */}
                    <span className="flex items-center gap-1 flex-1 text-left">
                      {option.value === 'all' ? (
                        <span className={cn(isSelected ? 'text-foreground font-medium' : '')}>All Routes</span>
                      ) : (
                        <>
                          <span className={cn(option.fromColor, isSelected && 'font-medium')}>{option.from}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-0.5" />
                          <span className={cn(option.toColor, isSelected && 'font-medium')}>{option.to}</span>
                        </>
                      )}
                    </span>

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="route-check"
                        className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                        transition={{ duration: 0.15 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
