'use client'

import { motion, useInView } from 'motion/react'
import { Activity, Clock, Percent, TrendingUp } from 'lucide-react'
import { useRef } from 'react'
import { useStats } from '@/hooks/useStats'
import { AnimatedCounter } from '@/components/animated-counter'
import { Skeleton } from '@/components/ui/skeleton'

const statItems = [
  { icon: Activity, label: 'Total Transactions', suffix: '', decimals: 0, color: 'text-blue-400' },
  { icon: TrendingUp, label: 'Volume Bridged', suffix: ' zkLTC', decimals: 2, color: 'text-violet-400' },
  { icon: Clock, label: 'Average Relay', suffix: 's', decimals: 0, color: 'text-cyan-400' },
  { icon: Percent, label: 'Bridge Fee', suffix: '%', decimals: 1, color: 'text-emerald-400' },
]

export function Stats() {
  const { totalTransactions, totalVolume, isLoading } = useStats()
  const values = [totalTransactions, totalVolume, 20, 0.3]

  return (
    <section id="stats" className="section-shell overflow-hidden">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[80px]" />
      </div>

      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
        {statItems.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative text-center"
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/[0.02] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                {/* Icon with pulse */}
                <motion.div
                  className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.06] ${stat.color} ring-1 ring-primary/10`}
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </motion.div>

                {/* Number */}
                <div className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
                  {isLoading ? (
                    <Skeleton className="mx-auto h-10 w-24" />
                  ) : (
                    <AnimatedCounter
                      value={values[index]}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  )}
                </div>

                {/* Label */}
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>

              {/* Separator line (except last) */}
              {index < statItems.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-16 w-px -translate-y-1/2 md:block">
                  <div className="h-full w-full bg-gradient-to-b from-transparent via-border/60 to-transparent" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
