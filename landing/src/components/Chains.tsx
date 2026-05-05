import { motion } from 'framer-motion'
import { ArrowLeftRight } from 'lucide-react'

export function Chains() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Supported Chains
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Seamlessly bridge between LiteForge Layer 1 and Ethereum Sepolia.
          </p>
        </motion.div>

        {/* Chain cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4"
        >
          {/* LiteForge */}
          <div className="glass-card p-6 md:p-8 flex-1 max-w-sm w-full text-center">
            <div className="flex justify-center mb-4">
              <img src="/litvm.png" alt="LiteForge" className="w-12 h-12 rounded-lg" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">LiteForge</h3>
            <p className="text-sm text-muted-foreground mb-3">Layer 1</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Chain ID</span>
                <span className="font-mono text-foreground">4441</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Token</span>
                <span className="font-mono text-foreground">zkLTC</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Block Time</span>
                <span className="font-mono text-foreground">~2s</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
          </motion.div>

          {/* Sepolia */}
          <div className="glass-card p-6 md:p-8 flex-1 max-w-sm w-full text-center">
            <div className="flex justify-center mb-4">
              <img src="/eth.png" alt="Ethereum" className="w-12 h-12 rounded-lg" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Sepolia</h3>
            <p className="text-sm text-muted-foreground mb-3">Ethereum Testnet</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Chain ID</span>
                <span className="font-mono text-foreground">11155111</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Token</span>
                <span className="font-mono text-foreground">wzkLTC</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                <span>Block Time</span>
                <span className="font-mono text-foreground">~12s</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
