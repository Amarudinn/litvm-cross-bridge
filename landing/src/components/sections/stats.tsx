'use client'

import { motion, useInView } from 'motion/react'
import { Activity, Clock, Percent, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useStats } from '@/hooks/useStats'

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    if (!isInView) return
    const duration = 1600
    const start = performance.now()

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toLocaleString()}
      {suffix}
    </span>
  )
}

export function Stats() {
  const { totalTransactions, totalVolume, isLoading } = useStats()
  const stats = [
    { icon: Activity, label: 'Total Transactions', value: totalTransactions, suffix: '', decimals: 0 },
    { icon: TrendingUp, label: 'Volume Bridged', value: totalVolume, suffix: ' zkLTC', decimals: 2 },
    { icon: Clock, label: 'Average Relay', value: 20, suffix: 's', decimals: 0 },
    { icon: Percent, label: 'Bridge Fee', value: 0.3, suffix: '%', decimals: 1 },
  ]

  return (
    <section className="section-shell">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full rounded-3xl">
                <CardContent className="p-5 text-center md:p-6">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mb-1 min-h-9 text-2xl font-bold tracking-tight md:text-3xl">
                    {isLoading ? (
                      <span className="mx-auto block h-8 w-20 animate-pulse rounded-lg bg-muted" />
                    ) : (
                      <AnimatedNumber value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground md:text-sm">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
