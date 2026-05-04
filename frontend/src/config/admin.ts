const STORAGE_KEY = 'litvm-admin-key'

export const adminConfig = {
  apiUrl: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001',
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
  const url = `${adminConfig.apiUrl}${endpoint}`
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
