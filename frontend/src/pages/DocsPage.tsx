import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { Overview } from '@/components/docs/content/Overview'
import { BridgeArchitecture } from '@/components/docs/content/BridgeArchitecture'
import { BridgeContract } from '@/components/docs/content/BridgeContract'
import { BridgeGuide } from '@/components/docs/content/BridgeGuide'
import { BridgeMigration } from '@/components/docs/content/BridgeMigration'

function getContent(section?: string, subsection?: string) {
  if (!section || section === 'overview') {
    return <Overview />
  }

  if (section === 'bridge') {
    switch (subsection) {
      case 'architecture':
        return <BridgeArchitecture />
      case 'contract':
        return <BridgeContract />
      case 'guide':
        return <BridgeGuide />
      case 'migration':
        return <BridgeMigration />
      default:
        return <BridgeArchitecture />
    }
  }

  return <Overview />
}

export default function DocsPage() {
  const { section, subsection } = useParams<{ section?: string; subsection?: string }>()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const content = getContent(section, subsection)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      <DocsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 shrink-0" />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-14 left-0 right-0 z-30 flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors border border-border/40"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">Documentation</span>
        </div>

        {/* Spacer for fixed mobile header */}
        <div className="lg:hidden h-14" />

        {/* Content area */}
        <motion.div
          key={`${section}-${subsection}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto px-6 py-8 lg:px-10 lg:py-10"
        >
          {content}
        </motion.div>
      </main>
    </div>
  )
}
