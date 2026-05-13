import { motion } from 'framer-motion'
import { SwapCard } from '@/components/swap/SwapCard'

export default function SwapPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full flex flex-col items-center"
      >
        <SwapCard />
      </motion.div>
    </div>
  )
}
