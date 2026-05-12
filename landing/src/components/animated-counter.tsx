'use client'

import { useInView, useMotionValue, useTransform, motion, animate } from 'motion/react'
import { useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
}

export function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, duration = 1.6 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => {
    if (decimals > 0) return v.toFixed(decimals)
    return Math.floor(v).toLocaleString()
  })

  useEffect(() => {
    if (!isInView) return
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [isInView, value, motionValue, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
