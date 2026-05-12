'use client'

import { motion, useScroll, useSpring, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { useUiStore } from '@/stores/ui-store'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCallback } from 'react'

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'stats', label: 'Stats' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'chains', label: 'Chains' },
]

export function Navigation() {
  const isScrolled = useUiStore((s) => s.isScrolled)
  const activeSection = useUiStore((s) => s.activeSection)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 80, damping: 25, restDelta: 0.001 })
  const reduceMotion = useReducedMotion()

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <motion.nav
      initial={reduceMotion ? undefined : { y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        isScrolled
          ? 'border-b border-border/30 bg-background/70 backdrop-blur-xl shadow-soft'
          : 'bg-transparent'
      )}
    >
      {/* Scroll progress bar with glow */}
      <motion.div
        style={{ scaleX, transformOrigin: '0%' }}
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary shadow-glow-sm"
      />

      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <motion.a
          href="#hero"
          onClick={(e) => handleNavClick(e, 'hero')}
          className="flex items-center gap-2.5"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <Image src="/multyra.png" alt="Multyra" width={30} height={30} className="relative rounded-lg" priority />
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
          </div>
          <span className="text-sm font-bold tracking-tight">Multyra</span>
        </motion.a>

        {/* Section indicators */}
        <div className="hidden items-center gap-1 rounded-full border border-border/30 bg-background/50 px-2 py-1.5 backdrop-blur-xl md:flex">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => handleNavClick(e, section.id)}
              className="group relative flex items-center justify-center px-3 py-1"
            >
              {activeSection === section.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-primary/10 shadow-glow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  'relative text-xs font-medium transition-colors duration-300',
                  activeSection === section.id
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {section.label}
              </span>
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href="https://app.multyra.xyz">
              Launch App <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </motion.nav>
  )
}
