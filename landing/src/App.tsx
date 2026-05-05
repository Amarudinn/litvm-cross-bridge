import { Hero } from './components/Hero'
import { Stats } from './components/Stats'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { Chains } from './components/Chains'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Chains />
      <Footer />
    </div>
  )
}
