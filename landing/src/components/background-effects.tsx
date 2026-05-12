'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

export function BackgroundEffects() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const yOne = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -180])
  const yTwo = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 140])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 28])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        style={{ y: yOne, rotate }}
        className="absolute -left-24 top-[18%] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/10"
      />
      <motion.div
        style={{ y: yTwo }}
        className="absolute -right-20 top-[48%] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/10"
      />
      <motion.div
        animate={reduceMotion ? undefined : { opacity: [0.18, 0.36, 0.18], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-15%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.05)_1px,transparent_1px)] [background-size:28px_28px] opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]" />
    </div>
  )
}
