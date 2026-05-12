import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/navigation'
import './globals.css'

const inter = localFont({
  src: [
    {
      path: '../fonts/Inter-Variable.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Multyra Bridge — Smooth zkLTC Bridging',
  description: 'A smooth, elegant 1:1 zkLTC bridge for LiteForge, Sepolia, and Base Sepolia.',
  icons: {
    icon: '/multyra.png',
    shortcut: '/multyra.png',
    apple: '/multyra.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#4f6ef7',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen overflow-x-hidden antialiased`}>
        <Providers>
          <div className="noise-overlay pointer-events-none fixed inset-0 z-[100]" aria-hidden="true" />
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}
