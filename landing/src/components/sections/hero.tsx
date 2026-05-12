'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, BookOpen } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextReveal } from '@/components/text-reveal'
import { ParticleField } from '@/components/particle-field'

export function Hero() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 0.3], [0, reduceMotion ? 0 : 100])
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-grid" />
      <ParticleField />

      {/* Orbiting rings */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="absolute h-[500px] w-[500px] rounded-full border border-primary/[0.06]"
          style={{ marginLeft: -250, marginTop: -250 }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute h-[700px] w-[700px] rounded-full border border-accent/[0.04]"
          style={{ marginLeft: -350, marginTop: -350 }}
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute h-[900px] w-[900px] rounded-full border border-primary/[0.03]"
          style={{ marginLeft: -450, marginTop: -450 }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        {/* Orbiting dots */}
        <motion.div
          className="absolute h-2 w-2 rounded-full bg-primary/60 shadow-glow-sm"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ ['--orbit-radius' as any]: '250px', marginLeft: -4, marginTop: -4, transformOrigin: '4px 4px' }}
        >
          <div style={{ transform: 'translateX(250px)' }} className="h-2 w-2 rounded-full bg-primary shadow-glow-sm" />
        </motion.div>
        <motion.div
          className="absolute"
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
          style={{ marginLeft: -4, marginTop: -4 }}
        >
          <div style={{ transform: 'translateX(350px)' }} className="h-1.5 w-1.5 rounded-full bg-accent/60 shadow-glow-accent" />
        </motion.div>
      </div>

      {/* Main content with parallax */}
      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 mx-auto flex min-h-screen max-w-[1120px] flex-col items-center justify-center px-4 text-center sm:px-6"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge className="mb-6 gap-2 border-primary/20 bg-primary/5 px-3 py-1.5 backdrop-blur-xl sm:mb-8 sm:px-4 sm:py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium">Live on LiteForge</span>
          </Badge>
        </motion.div>

        {/* Headline with text reveal */}
        <TextReveal
          text="Bridge zkLTC with calm, precise speed"
          as="h1"
          mode="word"
          className="max-w-5xl text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl md:text-7xl lg:text-8xl"
        />

        {/* Gradient underline accent */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 h-1 w-24 origin-center rounded-full bg-gradient-to-r from-primary via-accent to-primary shadow-glow-sm sm:w-32"
        />

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mx-auto mt-6 max-w-[560px] text-balance text-base leading-relaxed text-muted-foreground sm:mt-8 sm:text-lg md:text-xl"
        >
          A smooth 1:1 backed bridge for LiteForge, Ethereum Sepolia, and Base Sepolia — no slippage, no complexity.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="lg" variant="glow">
              <a href="https://app.multyra.xyz" className="gap-2">
                Launch Bridge <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="lg" variant="outline">
              <a href="https://app.multyra.xyz/docs" className="gap-2">
                <BookOpen className="h-4 w-4" /> Read Docs
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating chain logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-12 flex items-center gap-3 sm:mt-16 sm:gap-4"
        >
          {['/litvm.png', '/eth.png', '/base.jpeg'].map((src, i) => (
            <motion.div
              key={i}
              animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/30 bg-card/50 backdrop-blur-xl sm:h-12 sm:w-12 sm:rounded-2xl"
            >
              <Image src={src} alt="" width={28} height={28} className="rounded-lg" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8"
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Scroll</span>
          <div className="flex h-10 w-6 justify-center rounded-full border border-muted-foreground/20 p-1.5">
            <motion.span
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-1 rounded-full bg-primary/70"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
