import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Activity, TrendingUp, Clock, Percent } from 'lucide-react'
import { useStats } from '@/hooks/useStats'

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const duration = 2000
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(startValue + (value - startValue) * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
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
    {
      icon: <Activity className="h-5 w-5" />,
      label: 'Total Transactions',
      value: totalTransactions,
      suffix: '',
      decimals: 0,
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Volume Bridged',
      value: totalVolume,
      suffix: ' zkLTC',
      decimals: 2,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: 'Avg. Bridge Time',
      value: 20,
      suffix: 's',
      decimals: 0,
    },
    {
      icon: <Percent className="h-5 w-5" />,
      label: 'Bridge Fee',
      value: 0.3,
      suffix: '%',
      decimals: 1,
    },
  ]

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-5 md:p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3">
                {stat.icon}
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-7 bg-muted/50 rounded animate-pulse" />
                ) : (
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                )}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
