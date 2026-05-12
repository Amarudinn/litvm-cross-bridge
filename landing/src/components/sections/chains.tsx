'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useRef } from 'react'

const chains = [
  { name: 'LiteForge', subtitle: 'Layer 2', image: '/litvm.png', chainId: '4441', token: 'zkLTC', time: '~2s', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'hover:border-blue-500/30' },
  { name: 'Sepolia', subtitle: 'Ethereum Testnet', image: '/eth.png', chainId: '11155111', token: 'wzkLTC', time: '~12s', color: 'from-violet-500/20 to-indigo-500/20', borderColor: 'hover:border-violet-500/30' },
  { name: 'Base Sepolia', subtitle: 'Base Testnet', image: '/base.jpeg', chainId: '84532', token: 'wzkLTC', time: '~2s', color: 'from-emerald-500/20 to-teal-500/20', borderColor: 'hover:border-emerald-500/30' },
]

function ChainCard({ chain, index }: { chain: typeof chains[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 })

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 40, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="group relative"
    >
      {/* Glow behind card */}
      <div className={cn(
        'absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100',
        chain.color
      )} />

      <div className={cn(
        'relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card/70 p-6 backdrop-blur-xl transition-all duration-500',
        chain.borderColor
      )}>
        {/* Shimmer */}
        <div className="shimmer absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Top gradient accent */}
        <div className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          chain.color.replace('/20', '/60')
        )} />

        <div className="relative" style={{ transform: 'translateZ(15px)' }}>
          {/* Chain icon */}
          <motion.div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Image src={chain.image} alt={chain.name} width={40} height={40} className="rounded-xl" />
          </motion.div>

          {/* Chain info */}
          <h3 className="text-xl font-bold">{chain.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{chain.subtitle}</p>

          {/* Details */}
          <div className="mt-5 space-y-2">
            {[
              ['Chain ID', chain.chainId],
              ['Token', chain.token],
              ['Block Time', chain.time],
            ].map(([label, value], i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 + i * 0.05 }}
                className="flex items-center justify-between rounded-xl bg-muted/20 px-3.5 py-2.5 text-sm ring-1 ring-border/20"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function Chains() {
  return (
    <section id="chains" className="section-shell">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mb-14 max-w-2xl text-center"
      >
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
        >
          Supported routes
        </motion.p>
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
          Move between the chains{' '}
          <span className="gradient-text">that matter.</span>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          LiteForge connects to Sepolia and Base Sepolia with a relayer-backed bridge path.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3" style={{ perspective: '1000px' }}>
        {chains.map((chain, index) => (
          <ChainCard key={chain.name} chain={chain} index={index} />
        ))}
      </div>
    </section>
  )
}
