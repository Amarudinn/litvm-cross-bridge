'use client'

import { motion } from 'motion/react'
import { ArrowUpRight, Github, Send } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const links = [
  { label: 'Launch App', href: 'https://app.multyra.xyz' },
  { label: 'Docs', href: 'https://app.multyra.xyz/docs' },
  { label: 'Explorer', href: 'https://app.multyra.xyz/explorer' },
  { label: 'History', href: 'https://app.multyra.xyz/history' },
]

export function Footer() {
  return (
    <footer className="relative px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mx-auto max-w-[1120px]"
      >
        {/* Main content */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/multyra.png" alt="Multyra" width={32} height={32} className="rounded-xl" />
            <span className="text-base font-semibold tracking-tight">Multyra</span>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-200 group-hover:opacity-100" />
              </a>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center justify-center gap-2">
            <a
              href="https://github.com/Amarudinn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
              aria-label="Telegram"
            >
              <Send className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
              aria-label="X"
            >
              X
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-10 text-center text-xs text-muted-foreground/50 sm:mt-12">
          <p>© {new Date().getFullYear()} Multyra. All rights reserved.</p>
        </div>
      </motion.div>
    </footer>
  )
}
