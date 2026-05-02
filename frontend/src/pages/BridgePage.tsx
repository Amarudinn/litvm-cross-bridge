import { motion } from 'framer-motion'
import { BridgeCard } from '@/components/bridge/BridgeCard'
import { TxStatusModal } from '@/components/transaction/TxStatusModal'

export default function BridgePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:py-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full flex flex-col items-center"
      >
        <BridgeCard />
      </motion.div>
      <TxStatusModal />
    </div>
  )
}
