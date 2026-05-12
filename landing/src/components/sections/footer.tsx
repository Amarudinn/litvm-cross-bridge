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
    <footer className="relative overflow-hidden border-t border-border/60 px-6 py-12 md:py-16">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -bottom-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <Image src="/multyra.png" alt="Multyra" width={38} height={38} className="rounded-xl shadow-soft" />
                <div>
                  <p className="font-bold tracking-tight">Multyra</p>
                  <p className="text-sm text-muted-foreground">Smooth zkLTC bridge experience.</p>
                </div>
              </div>
              <h3 className="max-w-xl text-balance text-2xl font-bold tracking-tight md:text-4xl">Ready to move zkLTC with a cleaner bridge?</h3>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">Launch the app, read the docs, or explore the latest bridge activity from one polished destination.</p>
            </div>

            <div className="flex flex-col gap-5 lg:items-end">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="https://app.multyra.xyz">
                  Launch App <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground lg:justify-end">
                {links.map((link) => (
                  <a key={link.label} href={link.href} className="rounded-full border border-border/60 bg-background/35 px-4 py-2 transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <a href="https://github.com/Amarudinn" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/35 transition-colors hover:text-foreground" aria-label="GitHub">
                  <Github className="h-4 w-4" />
                </a>
                <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/35 transition-colors hover:text-foreground" aria-label="Telegram">
                  <Send className="h-4 w-4" />
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/35 text-sm font-bold transition-colors hover:text-foreground" aria-label="X">
                  X
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Multyra. Built for the LiteForge bridge ecosystem.</p>
          <p>LiteForge · Sepolia · Base Sepolia</p>
        </div>
      </div>
    </footer>
  )
}
