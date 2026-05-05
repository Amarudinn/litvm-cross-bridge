import { motion } from 'framer-motion'
import { Zap, Shield, Coins, RefreshCw } from 'lucide-react'

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Fast Bridging',
    description: 'Bridge from LiteForge to Sepolia in ~20 seconds. Automated Relayer processes your transaction instantly.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Secure',
    description: 'Double-layer replay protection, reentrancy guards, pausable contracts, and on-chain balance verification.',
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: 'Low Fee',
    description: 'Only 0.3% per transaction. No hidden costs, no slippage. What you see is what you get.',
  },
  {
    icon: <RefreshCw className="h-6 w-6" />,
    title: '1:1 Backed',
    description: 'Every wzkLTC in circulation is fully collateralized by an equal amount of zkLTC locked in the BridgeVault.',
  },
]

export function Features() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Multyra Bridge?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Built for speed, security, and simplicity.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 md:p-8 group hover:border-primary/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
