'use client'

import { AuroraBackground } from '@/components/aurora-background'
import { MagneticCursor } from '@/components/magnetic-cursor'
import { Chains } from '@/components/sections/chains'
import { Features } from '@/components/sections/features'
import { Footer } from '@/components/sections/footer'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Stats } from '@/components/sections/stats'
import { useSectionObserver } from '@/hooks/useSectionObserver'

export default function Page() {
  useSectionObserver()

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Global ambient background */}
      <AuroraBackground />

      {/* Custom cursor (desktop only) */}
      <MagneticCursor />

      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Chains />
      <Footer />
    </main>
  )
}
