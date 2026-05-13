import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { config } from './config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

import BridgePage from './pages/BridgePage'
import SwapPage from './pages/SwapPage'
import HistoryPage from './pages/HistoryPage'
import ExplorerPage from './pages/ExplorerPage'
import AdminPage from './pages/AdminPage'
import DocsPage from './pages/DocsPage'
import Header from './components/layout/Header'
import { SupportWidget } from './components/support/SupportWidget'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#4f6ef7', borderRadius: 'medium' })}>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <Header />
              <main className="flex-1 flex flex-col pt-14">
                <Routes>
                  <Route path="/" element={<BridgePage />} />
                  <Route path="/swap" element={<SwapPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/explorer" element={<ExplorerPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="/docs/:section" element={<DocsPage />} />
                  <Route path="/docs/:section/:subsection" element={<DocsPage />} />
                </Routes>
              </main>
            </div>
            <Toaster theme="dark" position="bottom-right" />
            <SupportWidget />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
