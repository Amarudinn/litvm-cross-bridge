'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

const chains = [
  { name: 'LiteForge', subtitle: 'Layer 2', image: '/litvm.png', chainId: '4441', token: 'zkLTC', time: '~2s' },
  { name: 'Sepolia', subtitle: 'Ethereum Testnet', image: '/eth.png', chainId: '11155111', token: 'wzkLTC', time: '~12s' },
  { name: 'Base Sepolia', subtitle: 'Base Testnet', image: '/eth.png', chainId: '84532', token: 'wzkLTC', time: '~2s' },
]

export function Chains() {
  return (
    <section className="section-shell">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
        className="mx-auto mb-14 max-w-2xl text-center"
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">Supported routes</p>
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">Move between the chains that matter.</h2>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">LiteForge connects to Sepolia and Base Sepolia with a relayer-backed bridge path.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {chains.map((chain, index) => (
          <motion.div
            key={chain.name}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay: index * 0.09 }}
            whileHover={{ y: -5 }}
          >
            <Card className="group relative h-full overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative p-7 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/70 transition-transform duration-500 group-hover:scale-110">
                  <Image src={chain.image} alt={chain.name} width={38} height={38} className="rounded-xl" />
                </div>
                <h3 className="text-xl font-semibold">{chain.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{chain.subtitle}</p>
                <div className="mt-6 space-y-2 text-sm">
                  {[
                    ['Chain ID', chain.chainId],
                    ['Token', chain.token],
                    ['Block Time', chain.time],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-muted/45 px-4 py-2.5 text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-mono text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
