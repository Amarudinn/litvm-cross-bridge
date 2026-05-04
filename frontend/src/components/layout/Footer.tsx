export default function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>Multyra Bridge &mdash; Bridging Sepolia and LiteForge</p>
        <div className="flex items-center gap-4">
          <a
            href="https://liteforge.explorer.caldera.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            LiteForge Explorer
          </a>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Sepolia Explorer
          </a>
        </div>
      </div>
    </footer>
  )
}
