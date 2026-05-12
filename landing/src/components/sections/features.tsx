'use client'

import { motion } from 'motion/react'
import { Coins, Layers3, LockKeyhole, RadioTower } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: RadioTower,
    title: 'Event-driven bridge engine',
    description: 'Relayers listen to on-chain events and move each bridge request through a clear execution path.',
  },
  {
    icon: LockKeyhole,
    title: 'Replay protection built in',
    description: 'Nonce-based process IDs and guarded contracts keep duplicate execution out of the bridge flow.',
  },
  {
    icon: Coins,
    title: '1:1 backed representation',
    description: 'Wrapped zkLTC maps cleanly to native zkLTC locked in the vault without pool complexity.',
  },
  {
    icon: Layers3,
    title: 'Multi-chain interface ready',
    description: 'The interface is shaped for LiteForge today and additional supported destinations tomorrow.',
  },
]

export function Features() {
  return (
    <section id="features" className="section-shell">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mb-16 max-w-2xl text-center"
      >
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
        >
          Why Multyra
        </motion.p>
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
          A premium bridge surface for{' '}
          <span className="gradient-text">serious infrastructure.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
          Clean visuals, sharp interaction, and mechanics that match the LiteForge bridge architecture.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-card/80 hover:shadow-glow-sm md:p-7"
            >
              {/* Subtle hover gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                {/* Icon */}
                <motion.div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </motion.div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
