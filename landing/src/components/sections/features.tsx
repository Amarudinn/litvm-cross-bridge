'use client'

import { motion } from 'motion/react'
import { Coins, Layers3, LockKeyhole, RadioTower } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: RadioTower,
    eyebrow: 'Live relay',
    title: 'Event-driven bridge engine',
    description: 'Locks, burns, mints, and unlocks are tracked through a relayer flow that feels instant and predictable for users.',
    gradient: 'from-blue-500/30 via-cyan-400/10 to-transparent',
  },
  {
    icon: LockKeyhole,
    eyebrow: 'Protected path',
    title: 'Replay-safe by design',
    description: 'Processed transaction IDs, nonce checks, and guarded contracts reduce duplicate execution risk across every route.',
    gradient: 'from-violet-500/30 via-fuchsia-400/10 to-transparent',
  },
  {
    icon: Coins,
    eyebrow: 'Clear accounting',
    title: '1:1 liquidity model',
    description: 'No pool math. No price movement. Wrapped zkLTC represents native zkLTC locked in the vault with transparent fees.',
    gradient: 'from-emerald-500/30 via-cyan-400/10 to-transparent',
  },
  {
    icon: Layers3,
    eyebrow: 'Multi-chain ready',
    title: 'Built to expand cleanly',
    description: 'LiteForge, Sepolia, and Base Sepolia share one refined experience while the system stays ready for more routes.',
    gradient: 'from-amber-500/30 via-orange-400/10 to-transparent',
  },
]

export function Features() {
  return (
    <section className="section-shell">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
        className="mx-auto mb-14 max-w-3xl text-center"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">Why Multyra</p>
        <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">Bridge technology that looks as sharp as it works.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Every card, animation, and metric is designed to make the bridge feel premium without hiding the mechanics.</p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              variants={{ hidden: { opacity: 0, y: 34, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, rotateX: 2, rotateY: index % 2 === 0 ? -2 : 2 }}
              className="perspective-1000"
            >
              <Card className="group relative h-full overflow-hidden rounded-[2rem] border-white/10 bg-card/60 shadow-[0_28px_90px_hsl(var(--primary)/0.10)]">
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity duration-500 group-hover:opacity-100', feature.gradient)} />
                <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full border border-white/10 bg-white/10 blur-sm transition-transform duration-700 group-hover:scale-125 dark:bg-white/5" />
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-40" />
                <CardContent className="relative p-7 md:p-8">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/70 text-primary shadow-soft ring-1 ring-border/70 backdrop-blur-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xl">{feature.eyebrow}</span>
                  </div>
                  <h3 className="mb-3 max-w-md text-2xl font-bold tracking-tight">{feature.title}</h3>
                  <p className="max-w-xl leading-7 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
