'use client'

import { ThemeProvider } from 'next-themes'
import Lenis from 'lenis'
import { ReactNode, useEffect } from 'react'
import { useUiStore } from '@/stores/ui-store'

export function Providers({ children }: { children: ReactNode }) {
  const setScrolled = useUiStore((state) => state.setScrolled)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.08,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      lenis.destroy()
    }
  }, [setScrolled])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}
