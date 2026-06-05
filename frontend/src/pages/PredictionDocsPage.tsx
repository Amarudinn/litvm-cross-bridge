import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, BracketsCurly, Check, ClipboardText, Compass, Database, FileCode, Flag, List, X } from '@phosphor-icons/react'
import overviewMd from '@/docs/overview.md?raw'
import architectureMd from '@/docs/architecture.md?raw'
import guideMd from '@/docs/guide.md?raw'
import contractMd from '@/docs/contract.md?raw'
import apiMd from '@/docs/api.md?raw'
import roadmapMd from '@/docs/roadmap.md?raw'

type DocSection = 'overview' | 'architecture' | 'guide' | 'contract' | 'api' | 'roadmap'

type DocSectionItem = {
  id: DocSection
  label: string
  icon: typeof BookOpen
  soon?: boolean
}

const sections: DocSectionItem[] = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'architecture', label: 'Architecture', icon: Database },
  { id: 'guide', label: 'Guide', icon: BookOpen },
  { id: 'contract', label: 'Contract', icon: BracketsCurly },
  { id: 'api', label: 'API', icon: FileCode, soon: true },
  { id: 'roadmap', label: 'Roadmap', icon: Flag },
]

const docs: Record<DocSection, string> = {
  overview: overviewMd,
  architecture: architectureMd,
  guide: guideMd,
  contract: contractMd,
  api: apiMd,
  roadmap: roadmapMd,
}

const sectionHashes: Record<DocSection, string> = {
  overview: 'overview',
  architecture: 'architecture',
  guide: 'guide',
  contract: 'contract',
  api: 'api',
  roadmap: 'roadmap',
}

const sectionsByHash = Object.fromEntries(
  Object.entries(sectionHashes).map(([section, hash]) => [hash, section])
) as Record<string, DocSection>

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(children.replace(/\n$/, ''))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="docs-code-block">
      <button type="button" onClick={copyCode} className="docs-copy-button">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre><code>{children}</code></pre>
    </div>
  )
}

export function PredictionDocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('overview')
  const [pageCopied, setPageCopied] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeMeta = sections.find((section) => section.id === activeSection) || sections[0]
  const ActiveIcon = activeMeta.icon

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    const section = sectionsByHash[hash]
    if (section) setActiveSection(section)
  }, [])

  function selectSection(section: DocSection) {
    setActiveSection(section)
    setPageCopied(false)
    setMobileMenuOpen(false)
    window.history.replaceState(null, '', `${window.location.pathname}#${sectionHashes[section]}`)
  }

  async function copyPage() {
    await navigator.clipboard.writeText(docs[activeSection])
    setPageCopied(true)
    window.setTimeout(() => setPageCopied(false), 1200)
  }

  return (
    <>
      <div className="lg:hidden fixed top-14 left-0 right-0 z-30 flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open docs menu"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors border border-border/40 cursor-pointer"
        >
          <List size={17} weight="bold" />
        </button>
        <span className="text-sm font-semibold text-foreground">Documentation</span>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-[3.6rem] left-0 right-0 bottom-0 z-50 transition-all duration-300 ease-in-out">
          <button
            type="button"
            aria-label="Close docs menu"
            className="absolute inset-0 bg-background/60 transition-opacity duration-300 ease-in-out cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background/80 backdrop-blur-sm border-r border-border/40 overflow-y-auto shadow-xl docs-mobile-drawer">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <span className="text-sm font-semibold">Documentation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <X size={17} weight="bold" />
              </button>
            </div>
            <nav className="py-4 px-3 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => selectSection(section.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon size={16} weight={activeSection === section.id ? 'fill' : 'bold'} className={activeSection === section.id ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="flex-1">{section.label}</span>
                    {section.soon && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none bg-primary/20 text-primary">soon</span>}
                  </button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="grid min-w-0 gap-6 pt-14 lg:grid-cols-[230px_minmax(0,1fr)] lg:pt-0">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <nav className="py-4 px-3 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon size={16} weight={activeSection === section.id ? 'fill' : 'bold'} className={activeSection === section.id ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="flex-1">{section.label}</span>
                  {section.soon && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none bg-primary/20 text-primary">soon</span>}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 px-0 sm:px-3 lg:min-h-[560px]">
          <div className="mx-auto mb-5 flex max-w-[780px] items-center justify-between gap-3 px-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <ActiveIcon size={20} weight="bold" className="shrink-0 text-primary" />
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{activeMeta.label}</h1>
              {activeMeta.soon && <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">Soon</span>}
            </div>
            <button
              type="button"
              onClick={copyPage}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground cursor-pointer"
            >
              {pageCopied ? <Check size={14} weight="bold" /> : <ClipboardText size={14} weight="bold" />}
              {pageCopied ? 'Copied' : 'Copy Page'}
            </button>
          </div>
          <article className="docs-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  const code = children as React.ReactElement<{ children?: string }>
                  return <CodeBlock>{String(code?.props?.children || '')}</CodeBlock>
                },
                table({ children }) {
                  return <div className="docs-table-scroll"><table>{children}</table></div>
                },
              }}
            >
              {docs[activeSection]}
            </ReactMarkdown>
          </article>
        </main>
      </div>
    </>
  )
}
