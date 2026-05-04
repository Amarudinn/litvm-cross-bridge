import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Search, List, Plus, Lock, LogOut, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HealthPanel } from '@/components/admin/HealthPanel'
import { QueueTable } from '@/components/admin/QueueTable'
import { VerifyForm } from '@/components/admin/VerifyForm'
import { InjectForm } from '@/components/admin/InjectForm'
import { useAdminHealth } from '@/hooks/useAdminApi'
import { isAdminLoggedIn, setAdminKey, clearAdminKey, adminFetch } from '@/config/admin'

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 animate-border-spin" />
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md animate-border-spin" />
      <Card className="relative rounded-2xl border-0 bg-card shadow-2xl">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!key.trim()) return
    setLoading(true)
    setError('')

    // Test the key by calling health endpoint
    setAdminKey(key.trim())
    try {
      await adminFetch('/admin/health')
      onLogin()
    } catch (err: any) {
      clearAdminKey()
      setError(err.message || 'Invalid API key')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 animate-border-spin" />
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md animate-border-spin" />
          <Card className="relative rounded-2xl border-0 bg-card shadow-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Admin Access</h2>
                <p className="text-xs text-muted-foreground mt-1">Enter your API key to continue</p>
              </div>

              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter admin API key..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                />

                {error && (
                  <p className="text-xs text-red-400 text-center">{error}</p>
                )}

                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loading || !key.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

function AdminDashboard() {
  const { data, isLoading, isError } = useAdminHealth()

  const handleLogout = () => {
    clearAdminKey()
    window.location.reload()
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Monitor and manage the bridge relayer
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        {/* Health Panel */}
        <div className="mb-6">
          <HealthPanel data={data} isLoading={isLoading} isError={isError} />
        </div>

        {/* Verify & Inject — side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SectionCard title="Verify Transaction" icon={<Search className="h-3.5 w-3.5 text-blue-400" />}>
            <VerifyForm />
          </SectionCard>

          <SectionCard title="Inject Transaction" icon={<Plus className="h-3.5 w-3.5 text-orange-400" />}>
            <InjectForm />
          </SectionCard>
        </div>

        {/* Transaction Queue — full width */}
        <SectionCard title="Transaction Queue" icon={<List className="h-3.5 w-3.5 text-purple-400" />}>
          <QueueTable />
        </SectionCard>
      </motion.div>
    </div>
  )
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn())

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />
  }

  return <AdminDashboard />
}
