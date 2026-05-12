'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const modes = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-10 w-28 rounded-full bg-muted/50" />

  return (
    <div className="flex rounded-full border border-border/70 bg-card/60 p-1 shadow-sm backdrop-blur-xl">
      {modes.map((mode) => {
        const Icon = mode.icon
        const active = theme === mode.value
        return (
          <Button
            key={mode.value}
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label={`Use ${mode.label} theme`}
            onClick={() => setTheme(mode.value)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}
