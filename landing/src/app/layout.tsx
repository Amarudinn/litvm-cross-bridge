import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ScrollProgress } from '@/components/scroll/scroll-progress'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Multyra Bridge — Smooth zkLTC Bridging',
  description: 'A smooth, elegant 1:1 zkLTC bridge for LiteForge, Sepolia, and Base Sepolia.',
}

export const viewport: Viewport = {
  themeColor: '#4f6ef7',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen overflow-x-hidden antialiased`}>
        <Providers>
          <ScrollProgress />
          {children}
        </Providers>
      </body>
    </html>
  )
}
