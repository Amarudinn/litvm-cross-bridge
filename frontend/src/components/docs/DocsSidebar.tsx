import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, BookOpen, Layers, ArrowRightLeft, Map, Coins, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  label: string
  path?: string
  icon?: React.ReactNode
  soon?: boolean
  children?: { label: string; path: string; soon?: boolean }[]
}

const sidebarItems: SidebarItem[] = [
  {
    label: 'Overview',
    path: '/docs/overview',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: 'Bridge',
    icon: <Layers className="h-4 w-4" />,
    soon: true,
    children: [
      { label: 'Architecture', path: '/docs/bridge/architecture' },
      { label: 'Contract', path: '/docs/bridge/contract' },
      { label: 'Guide', path: '/docs/bridge/guide' },
    ],
  },
  {
    label: 'Swap',
    icon: <ArrowRightLeft className="h-4 w-4" />,
    soon: true,
    children: [
      { label: 'Architecture', path: '#', soon: true },
      { label: 'Contract', path: '#', soon: true },
      { label: 'Guide', path: '#', soon: true },
    ],
  },
  {
    label: 'Roadmap',
    path: '#',
    icon: <Map className="h-4 w-4" />,
    soon: true,
  },
]

function isActive(itemPath: string, section?: string, subsection?: string): boolean {
  const currentPath = subsection ? `/docs/${section}/${subsection}` : section ? `/docs/${section}` : '/docs/overview'
  return itemPath === currentPath
}

function isParentActive(children: { label: string; path: string }[], section?: string, subsection?: string): boolean {
  const currentPath = subsection ? `/docs/${section}/${subsection}` : section ? `/docs/${section}` : '/docs/overview'
  return children.some(c => c.path === currentPath)
}

interface DocsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
  const { section, subsection } = useParams()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Bridge: true,
    Swap: false,
  })

  const toggleExpand = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const sidebarContent = (
    <nav className="py-4 px-3 space-y-1">
      {sidebarItems.map((item) => {
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = expanded[item.label] || false
        const parentActive = hasChildren && isParentActive(item.children!, section, subsection)
        const itemActive = item.path ? isActive(item.path, section, subsection) : false

        // Default to overview if no section
        const defaultActive = !section && item.path === '/docs/overview'

        return (
          <div key={item.label}>
            {/* Parent item */}
            {hasChildren ? (
              <button
                onClick={() => !item.soon && toggleExpand(item.label)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  parentActive && 'text-primary bg-primary/5',
                  !parentActive && !item.soon && 'text-foreground hover:bg-muted/50',
                  item.soon && 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  'shrink-0',
                  parentActive ? 'text-primary' : item.soon ? 'text-muted-foreground/40' : 'text-muted-foreground'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.soon && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none bg-primary/20 text-primary">
                    soon
                  </span>
                )}
                {!item.soon && (
                  <span className="text-muted-foreground/60">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>
            ) : (
              item.soon ? (
                <span
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                >
                  <span className="shrink-0 text-muted-foreground/40">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none bg-primary/20 text-primary">
                    soon
                  </span>
                </span>
              ) : (
                <Link
                  to={item.path!}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    (itemActive || defaultActive)
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'shrink-0',
                    (itemActive || defaultActive) ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            )}

            {/* Children */}
            {hasChildren && isExpanded && !item.soon && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border/40 pl-3">
                {item.children!.map((child) => {
                  const childActive = isActive(child.path, section, subsection)
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                        childActive
                          ? 'text-primary bg-primary/10 font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Children for soon items (show disabled) */}
            {hasChildren && isExpanded && item.soon && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border/20 pl-3">
                {item.children!.map((child) => (
                  <span
                    key={child.label}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground/40 cursor-not-allowed"
                  >
                    {child.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border/40 bg-background/80 backdrop-blur-sm overflow-y-auto fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-40">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          'lg:hidden fixed top-[3.6rem] left-0 right-0 bottom-0 z-50 transition-all duration-300 ease-in-out',
          isOpen ? 'visible' : 'invisible pointer-events-none'
        )}
      >
        {/* Backdrop - no blur, just dim */}
        <div
          className={cn(
            'absolute inset-0 bg-background/60 transition-opacity duration-300 ease-in-out',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
        {/* Sidebar panel */}
        <aside
          className={cn(
            'absolute left-0 top-0 bottom-0 w-72 bg-background/80 backdrop-blur-sm border-r border-border/40 overflow-y-auto shadow-xl transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm font-semibold">Documentation</span>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
