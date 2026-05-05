import { motion } from 'framer-motion'
import { Wallet, ArrowLeftRight, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    icon: <Wallet className="h-6 w-6" />,
    step: '01',
    title: 'Connect Wallet',
    description: 'Connect MetaMask or any injected wallet to get started.',
  },
  {
    icon: <ArrowLeftRight className="h-6 w-6" />,
    step: '02',
    title: 'Enter Amount',
    description: 'Choose your direction, enter the amount, and review the fee breakdown.',
  },
  {
    icon: <CheckCircle2 className="h-6 w-6" />,
    step: '03',
    title: 'Receive Tokens',
    description: 'Confirm the transaction and receive your tokens on the destination chain in seconds.',
  },
]

export function HowItWorks() {
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
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Three simple steps to bridge your tokens.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
              )}

              {/* Step number */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl glass-card mb-5">
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>
                <div className="text-primary">
                  {step.icon}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
