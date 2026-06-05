import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMarkets } from '@/hooks/use-markets';
import { useCategories } from '@/hooks/use-categories';
import { MarketCard } from '@/components/market/market-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';
import { CaretDown, FunnelSimple, MagnifyingGlass, X, ArrowUp } from '@phosphor-icons/react';

const filters = ['ALL', 'OPEN', 'CLOSED', 'RESOLVED'] as const;
type MarketFilter = typeof filters[number] | 'CANCELLED';
const PAGE_SIZE = 12;

function getValidFilter(value: string | null): MarketFilter {
  const allFilters = ['ALL', 'OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED'];
  return allFilters.includes(value as string) ? (value as MarketFilter) : 'OPEN';
}

function getValidCategoryId(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function MarketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = getValidFilter(searchParams.get('status'));
  const activeCategoryId = getValidCategoryId(searchParams.get('category'));
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { markets, statsMap, loading } = useMarkets(activeFilter === 'ALL' ? undefined : activeFilter, activeCategoryId);
  const { categories } = useCategories();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!filterRef.current) return;
    const activeBtn = filterRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, activeCategoryId]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [markets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredMarkets = normalizedSearch.length >= 2
    ? markets.filter(m => m.title.toLowerCase().includes(normalizedSearch))
    : markets;

  const visibleMarkets = filteredMarkets.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMarkets.length;

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  function updateMarketParams(next: { status?: MarketFilter; categoryId?: number }) {
    const params = new URLSearchParams(searchParams);
    if (next.status) {
      if (next.status === 'OPEN') params.delete('status');
      else params.set('status', next.status);
    }
    if ('categoryId' in next) {
      if (next.categoryId) params.set('category', String(next.categoryId));
      else params.delete('category');
    }
    setSearchParams(params);
  }

  return (
    <div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Status filter */}
        <div ref={filterRef} className="relative flex items-center gap-0.5 rounded-md bg-card border border-border p-1 shrink-0 overflow-x-auto">
          <div
            className="absolute rounded-sm bg-primary shadow-sm shadow-primary/20 transition-all duration-300 ease-[var(--ease-out)]"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width, top: 4, bottom: 4 }}
          />
          {filters.map((filter) => (
            <button
              key={filter}
              data-active={activeFilter === filter}
              onClick={() => updateMarketParams({ status: filter })}
              className={cn(
                'relative z-10 flex-1 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ease-[var(--ease-out)] whitespace-nowrap text-center',
                activeFilter === filter
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markets..."
              className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category dropdown */}
        <div ref={categoryRef} className="relative shrink-0">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-all duration-200 whitespace-nowrap',
              activeCategoryId
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/60'
            )}
          >
            {activeCategory ? (() => {
              const IconComp = getCategoryIcon(activeCategory.icon);
              return <IconComp size={14} />;
            })() : <FunnelSimple size={14} />}
            <span>{activeCategory ? activeCategory.name : 'All Categories'}</span>
            <CaretDown size={12} className={`transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {categoryOpen && (
            <div className="absolute z-50 mt-1.5 right-0 min-w-[180px] rounded-lg border border-border bg-card shadow-xl shadow-black/30 overflow-hidden dropdown-enter">
              <div className="max-h-[280px] overflow-y-auto py-1">
                <button
                  onClick={() => { updateMarketParams({ categoryId: undefined }); setCategoryOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors',
                    !activeCategoryId ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                  )}
                >
                  <FunnelSimple size={14} className="text-muted-foreground shrink-0" />
                  All Categories
                </button>
                {categories.map((cat) => {
                  const IconComp = getCategoryIcon(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { updateMarketParams({ categoryId: cat.id }); setCategoryOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors',
                        activeCategoryId === cat.id ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <IconComp size={14} className="text-muted-foreground shrink-0" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))
        ) : filteredMarkets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No markets found</p>
          </div>
        ) : (
          visibleMarkets.map((market) => (
            <MarketCard key={market.id} market={market} stats={statsMap[market.id] || []} categories={categories} />
          ))
        )}
      </div>

      {hasMore && !loading && (
        <div ref={loaderRef} className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}

      <BackToTop />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="md:hidden fixed bottom-20 right-5 z-50 h-10 w-10 rounded-full bg-accent flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
    >
      <ArrowUp size={18} weight="bold" className="text-background" />
    </button>
  );
}
