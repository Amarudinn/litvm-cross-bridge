'use client'

import { motion, useReducedMotion } from 'motion/react'

export function AuroraBackground() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Primary aurora blob */}
      <motion.div
        className="absolute -top-[40%] left-[10%] h-[80vh] w-[60vw] rounded-full bg-primary/[0.07] blur-[120px]"
        animate={reduceMotion ? undefined : {
          x: [0, 100, -50, 0],
          y: [0, -50, 30, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Accent aurora blob */}
      <motion.div
        className="absolute -bottom-[20%] right-[5%] h-[60vh] w-[50vw] rounded-full bg-accent/[0.05] blur-[100px]"
        animate={reduceMotion ? undefined : {
          x: [0, -80, 40, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Cyan accent */}
      <motion.div
        className="absolute left-[40%] top-[30%] h-[40vh] w-[35vw] rounded-full bg-[hsl(190_85%_55%/0.04)] blur-[80px]"
        animate={reduceMotion ? undefined : {
          x: [0, 60, -40, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
