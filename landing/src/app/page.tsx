import { BackgroundEffects } from '@/components/background-effects'
import { Chains } from '@/components/sections/chains'
import { Features } from '@/components/sections/features'
import { Footer } from '@/components/sections/footer'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Stats } from '@/components/sections/stats'

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundEffects />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Chains />
      <Footer />
    </main>
  )
}
