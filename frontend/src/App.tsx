import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { config } from './config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

import BridgePage from './pages/BridgePage'
import SwapPage from './pages/SwapPage'
import HistoryPage from './pages/HistoryPage'
import ExplorerPage from './pages/ExplorerPage'
import AdminPage from './pages/AdminPage'
import DocsPage from './pages/DocsPage'
import { PredictionDocsPage } from './pages/PredictionDocsPage'
import Header from './components/layout/Header'
import { SupportWidget } from './components/support/SupportWidget'
import ShapeGrid from './components/layout/ShapeGrid'
import { ToastProvider } from './components/ui/toast'

// Prediction Market
import { PredictionLayout } from './components/prediction-layout/page-layout'
import { MarketsPage } from './pages/prediction/markets'
import { MarketDetailPage } from './pages/prediction/market-detail'
import { LeaderboardPage } from './pages/prediction/leaderboard'
import { ProfilePage } from './pages/prediction/profile'
import { AdminPage as PredictionAdminPage } from './pages/prediction/admin'

const queryClient = new QueryClient()

function AppContent() {
  const location = useLocation()
  const isDocs = location.pathname.startsWith('/docs')
  const isPredict = location.pathname.startsWith('/predict')

  // Prediction pages have their own layout (header, footer, bottom nav)
  // but use the same color theme as the main app
  if (isPredict) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/predict/admin" element={<PredictionAdminPage />} />
          <Route element={<PredictionLayout />}>
            <Route path="/predict" element={<MarketsPage />} />
            <Route path="/predict/docs" element={<PredictionDocsPage />} />
            <Route path="/predict/market/:id" element={<MarketDetailPage />} />
            <Route path="/predict/leaderboard" element={<LeaderboardPage />} />
            <Route path="/predict/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground flex flex-col relative">
        {!isDocs && (
          <div className="fixed inset-0 z-0">
            <ShapeGrid
              speed={0.3}
              squareSize={45}
              direction="diagonal"
              borderColor="hsl(225 73% 57% / 0.08)"
              hoverFillColor="hsl(225 73% 57% / 0.15)"
              shape="square"
              hoverTrailAmount={5}
            />
          </div>
        )}
        <Header />
        <main className="flex-1 flex flex-col pt-14 relative z-10">
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
    </>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#4f6ef7', borderRadius: 'medium' })}>
          <ToastProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
