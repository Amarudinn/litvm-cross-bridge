'use client'

import { motion, useScroll, useTransform, useInView, useReducedMotion } from 'motion/react'
import { CheckCircle2, MousePointer2, Wallet, Zap } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: Wallet,
    title: 'Connect wallet',
    description: 'Connect and auto-detect your chain. The interface adapts to your active network.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
    glow: 'shadow-[0_0_30px_hsl(220_80%_55%/0.15)]',
  },
  {
    icon: MousePointer2,
    title: 'Choose action',
    description: 'Bridge tokens cross-chain, swap on same chain, or provide liquidity to earn fees.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/20',
    glow: 'shadow-[0_0_30px_hsl(260_70%_55%/0.15)]',
  },
  {
    icon: Zap,
    title: 'Best route found',
    description: 'The aggregator queries all DEXes in parallel and picks the optimal price and route for you.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    glow: 'shadow-[0_0_30px_hsl(40_80%_55%/0.15)]',
  },
  {
    icon: CheckCircle2,
    title: 'Execute & track',
    description: 'Confirm the transaction and track progress in real-time via the relayer-backed execution engine.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    glow: 'shadow-[0_0_30px_hsl(160_70%_45%/0.15)]',
  },
]

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20%' })
  const Icon = step.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : undefined}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex gap-5 md:gap-6"
    >
      {/* Timeline node */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn(
            'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl transition-all duration-500 md:h-14 md:w-14',
            step.bg, step.ring, step.color,
            isInView && step.glow
          )}
        >
          <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.8} />
          {/* Pulse ring */}
          <motion.div
            className={cn('absolute inset-0 rounded-2xl', step.ring)}
            animate={isInView ? { scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] } : undefined}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            style={{ border: '1px solid currentColor' }}
          />
        </motion.div>

        {/* Connector line between nodes */}
        {index < steps.length - 1 && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : undefined}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 h-16 w-px origin-top bg-gradient-to-b from-primary/40 to-transparent md:h-20"
          />
        )}
      </div>

      {/* Content card */}
      <motion.div
        whileHover={{ x: 4, transition: { duration: 0.2 } }}
        className="flex-1 pb-10 md:pb-14"
      >
        <div className="rounded-2xl border border-border/30 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 group-hover:border-border/60 group-hover:bg-card/70 group-hover:shadow-soft md:p-5">
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Step {index + 1}
            </span>
          </div>
          <h3 className="mb-2 text-lg font-semibold tracking-tight md:text-xl">{step.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 80%', 'end 50%'],
  })
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="how-it-works" className="section-shell">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mb-12 max-w-2xl text-center md:mb-16"
      >
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
        >
          How it works
        </motion.p>
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
          Four steps to{' '}
          <span className="gradient-text">DeFi across chains.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
          A guided flow that keeps you informed from connection to confirmation.
        </p>
      </motion.div>

      <div ref={containerRef} className="relative mx-auto max-w-lg">
        {/* Background track line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border/20 md:left-7" />

        {/* Scroll-linked progress line */}
        <motion.div
          style={{ height: reduceMotion ? '100%' : lineHeight }}
          className="absolute left-6 top-0 w-px origin-top bg-gradient-to-b from-primary via-accent to-emerald-500 md:left-7"
        >
          {/* Glowing tip */}
          <div className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary shadow-glow-sm" />
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
