const STORAGE_KEY = 'litvm-admin-key'

export const adminConfig = {
  // In production (Vercel): use /api proxy to avoid mixed content
  // In development: use direct URL to VPS
  apiUrl: import.meta.env.VITE_ADMIN_API_URL || '',
  // Prefix for API calls — maps to /admin on the relayer
  apiPrefix: import.meta.env.VITE_ADMIN_API_URL ? '/admin' : '/api/admin',
}

/**
 * Get admin API key from localStorage (set by login form)
 */
export function getAdminKey(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

/**
 * Save admin API key to localStorage
 */
export function setAdminKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key)
}

/**
 * Clear admin API key (logout)
 */
export function clearAdminKey() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Check if admin is logged in
 */
export function isAdminLoggedIn(): boolean {
  return !!getAdminKey()
}

/**
 * Extract tx hash from input — handles both raw hash and explorer URLs
 * e.g. "https://liteforge.explorer.caldera.xyz/tx/0xabc..." → "0xabc..."
 */
export function extractTxHash(input: string): string {
  const trimmed = input.trim()
  const txMatch = trimmed.match(/\/tx\/(0x[a-fA-F0-9]{64})/)
  if (txMatch) return txMatch[1]
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed
  return trimmed
}

/**
 * Fetch helper for admin API with auth from localStorage
 */
export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  // endpoint comes as "/admin/health", "/admin/queue", etc.
  // In dev (VITE_ADMIN_API_URL set): call VPS directly → http://VPS:3001/admin/health
  // In prod (no VITE_ADMIN_API_URL): use Vercel proxy → /api/admin/health
  let url: string
  if (adminConfig.apiUrl) {
    // Development: direct to VPS
    url = `${adminConfig.apiUrl}${endpoint}`
  } else {
    // Production: proxy via Vercel (/admin/health → /api/admin/health)
    url = `/api${endpoint}`
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getAdminKey(),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearAdminKey()
    throw new Error('Invalid API key — please login again')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}
