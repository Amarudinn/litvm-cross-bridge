'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, BookOpen } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function Hero() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 0.35], [0, reduceMotion ? 0 : 90])
  const opacity = useTransform(scrollYProgress, [0, 0.26], [1, 0.15])

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden px-6 py-6 mesh-bg">
      <div className="absolute inset-0 subtle-grid opacity-50" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background to-transparent" />

      <motion.div style={{ y, opacity }} className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-[13%] top-[18%] h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, 18, 0], y: [0, -16, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[14%] top-[20%] h-72 w-72 rounded-full bg-accent/12 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, -20, 0], y: [0, 18, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Image src="/multyra.png" alt="Multyra" width={34} height={34} className="rounded-xl" priority />
            <span className="text-sm font-bold tracking-tight">Multyra</span>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center py-16 text-center">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge className="mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live on LiteForge
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance text-5xl font-bold tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-8xl"
            >
              Bridge zkLTC with calm, <span className="gradient-text">precise speed</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18 }}
              className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl"
            >
              A smooth 1:1 backed bridge for LiteForge, Ethereum Sepolia, and Base Sepolia — no slippage, no liquidity pool complexity.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button asChild size="lg">
                <a href="https://app.multyra.xyz">
                  Launch App <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://app.multyra.xyz/docs">
                  <BookOpen className="h-4 w-4" /> Read Docs
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-10 w-6 justify-center rounded-full border border-muted-foreground/30 p-1.5"
        >
          <span className="h-2.5 w-1 rounded-full bg-muted-foreground/55" />
        </motion.div>
      </motion.div>
    </section>
  )
}
