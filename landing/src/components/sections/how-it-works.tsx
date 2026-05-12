'use client'

import { motion } from 'motion/react'
import { ArrowUpRight, CheckCircle2, MousePointer2, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const steps = [
  { icon: Wallet, step: '01', title: 'Connect', description: 'Connect your wallet and the interface instantly prepares the best route context.' },
  { icon: MousePointer2, step: '02', title: 'Confirm', description: 'Enter amount, review details, and approve a clean on-chain action without clutter.' },
  { icon: CheckCircle2, step: '03', title: 'Arrive', description: 'The relayer completes destination execution while the page keeps status feeling alive.' },
]

export function HowItWorks() {
  return (
    <section className="section-shell">
      <div className="absolute inset-x-0 top-20 -z-10 h-[28rem] rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-cyan-400/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
        className="mx-auto mb-14 max-w-3xl text-center"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">How it works</p>
        <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">A bridge flow that feels cinematic.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Three focused moments, animated with restraint, so users always know what happens next.</p>
      </motion.div>

      <div className="relative grid grid-cols-1 gap-5 md:grid-cols-3">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-[12%] right-[12%] top-16 hidden h-px origin-left bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 md:block"
        />

        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 34, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8 }}
            >
              <Card className="group relative h-full overflow-hidden rounded-[2rem] bg-card/65">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_42%)] opacity-70 transition-opacity group-hover:opacity-100" />
                <div className="absolute right-5 top-5 text-6xl font-black tracking-tighter text-foreground/[0.04] dark:text-white/[0.04]">{step.step}</div>
                <CardContent className="relative p-7 text-center md:p-8">
                  <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-background/75 text-primary shadow-glow ring-1 ring-primary/15 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_24px_80px_hsl(var(--primary)/0.24)]">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-xl">
                    Step {step.step} <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold tracking-tight">{step.title}</h3>
                  <p className="leading-7 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
