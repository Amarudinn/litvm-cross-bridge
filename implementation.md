# Implementation Guide: Unify Prediction Theme

## Theme Reference (Main App - Dark Mode)

### Color System (CSS Variables)
```css
.dark {
  --background: 224 25% 5%;        /* #0b0c10 - page bg */
  --foreground: 213 31% 91%;       /* #e0e4ec - primary text */
  --card: 224 25% 7%;              /* #0f1116 - card bg */
  --card-foreground: 213 31% 91%;  /* #e0e4ec - card text */
  --primary: 225 73% 57%;          /* #4175e0 - blue (links, active nav) */
  --primary-foreground: 210 40% 98%; /* near-white */
  --secondary: 260 60% 55%;        /* #7c4ddb - purple */
  --muted: 223 20% 14%;            /* #1c1f27 - subtle bg */
  --muted-foreground: 215 20% 55%; /* #7a8599 - secondary text */
  --border: 223 18% 16%;           /* #22252e - borders */
  --input: 223 18% 18%;            /* input bg */
  --ring: 225 73% 57%;             /* blue focus ring */
}
```

### Tailwind Hardcoded Colors
```js
accent: '#10b981'        // emerald green - CTA buttons
accent.hover: '#34d399'  // lighter green
surface: '#131316'       // can map to card
surface.hover: '#1c1c21' // can map to muted
```

---

## Mapping: Prediction Classes → Main App Classes

| Prediction (current) | Main App (target) | Notes |
|---------------------|-------------------|-------|
| `bg-[#09090b]` | `bg-background` | Use CSS var |
| `bg-surface` | `bg-card` | Same role |
| `bg-surface-hover` | `bg-muted` | Hover/subtle bg |
| `text-text-primary` | `text-foreground` | Primary text |
| `text-text-secondary` | `text-muted-foreground` | Secondary text |
| `text-accent` | `text-accent` | Keep (emerald green) |
| `border-border` | `border-border` | Same (both use CSS var) |
| `border-border-hover` | `border-border` + hover state | Use opacity variant |
| `bg-background` (in inputs) | `bg-input` | Input background |
| `focus:border-accent` | `focus:ring-ring` | Focus state |

---

## Step-by-Step Implementation

### Step 1: Update App.tsx

Remove prediction-specific layout. Prediction routes go inside main layout:

```tsx
// REMOVE this block:
if (isPredict) {
  return (
    <div className="min-h-screen prediction-scope" style={{...}}>
      ...
    </div>
  )
}

// ADD prediction routes inside main layout Routes:
<Route path="/predict" element={<MarketsPage />} />
<Route path="/predict/market/:id" element={<MarketDetailPage />} />
<Route path="/predict/leaderboard" element={<LeaderboardPage />} />
<Route path="/predict/profile" element={<ProfilePage />} />
<Route path="/predict/admin" element={<PredictionAdminPage />} />
```

### Step 2: Update Prediction Pages (Search & Replace)

In all prediction page files, replace classes:

```
text-text-primary    →  text-foreground
text-text-secondary  →  text-muted-foreground
bg-surface           →  bg-card
bg-surface-hover     →  bg-muted
border-border-hover  →  border-border/60
bg-background        →  bg-background (keep - same)
text-accent          →  text-accent (keep - same)
```

Files to update:
- `pages/prediction/admin.tsx`
- `pages/prediction/markets.tsx`
- `pages/prediction/market-detail.tsx`
- `pages/prediction/leaderboard.tsx`
- `pages/prediction/profile.tsx`
- `components/market/market-card.tsx`
- `components/market/buy-ticket-modal.tsx`

### Step 3: Update Card Component

Simplify Card — remove prediction-specific detection:

```tsx
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        hover && "cursor-pointer hover:border-border/60 hover:bg-muted/50 hover:-translate-y-[1px] hover:shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
);
```

Prediction pages that need padding should use `<Card className="p-5">`.

### Step 4: Update Button Variants

Already mostly done. Ensure variants match:
```js
default: "bg-accent text-[#09090b] hover:bg-accent/90"   // green CTA
secondary: "bg-muted text-foreground hover:bg-muted/80"  // subtle
outline: "border border-border bg-background hover:bg-muted hover:text-foreground"
```

### Step 5: Update Header Active State

When on `/predict/*`, the "Prediction" nav item should be active (blue pill). Already handled by:
```tsx
location.pathname.startsWith(item.path)
```

### Step 6: Remove Unused Files

Delete:
- `frontend/src/components/prediction-layout/header.tsx`
- `frontend/src/components/prediction-layout/page-layout.tsx`
- `frontend/src/components/prediction-layout/PredictionLayout.tsx`
- `frontend/src/components/prediction-ui/` (entire folder - was reference only)
- `frontend/src/config/prediction/` (already copied to proper locations)
- `frontend/src/hooks/prediction/` (already moved)
- `frontend/src/lib/prediction/` (already copied)
- `frontend/src/styles/prediction/` (reference only)
- `frontend/src/prediction-providers.tsx`

### Step 7: Update market-card.tsx Glass Effects

Replace prediction-specific `.glass` and `.market-card` CSS with main app equivalent:
- Use `bg-card` with standard `border border-border`
- Optional: add animated gradient border (same as BridgeCard) for featured/open markets

### Step 8: Prediction Admin Page

Admin page (`/predict/admin`) currently renders full-screen without header. After unification:
- Keep full-screen behavior (admin has its own auth layer)
- But use same color palette (`bg-background`, `text-foreground`, etc.)
- The auth screens already use these classes, just need text color mapping

---

## Testing Checklist

After implementation:
- [ ] `/` (Bridge) — unchanged, still looks correct
- [ ] `/swap` — unchanged
- [ ] `/history` — unchanged
- [ ] `/predict` — markets list with same dark navy bg, cards match style
- [ ] `/predict/market/:id` — detail page with consistent colors
- [ ] `/predict/admin` — admin works with unified colors
- [ ] `/predict/leaderboard` — table with consistent text colors
- [ ] `/predict/profile` — profile page consistent
- [ ] Mobile responsive — bottom nav removed, use main header hamburger
- [ ] Buy ticket — MetaMask popup works
- [ ] Claim/refund — works
