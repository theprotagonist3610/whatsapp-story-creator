/**
 * stickers.js
 *
 * Stratégie : remote-first.
 * - getStickerUrl(filename)   → URL Supabase publique (primary)
 * - getLocalUrl(filename)     → URL locale Vite (fallback pour onError)
 * - listRemoteStickers()      → liste depuis le bucket Supabase
 * - LOCAL_STICKERS            → liste des stickers bundlés localement
 */

import { supabase } from './supabase.js'

// ─── Assets locaux (bundlés par Vite, toujours disponibles) ──────────────────

const stickerModules = import.meta.glob('/src/assets/stickers/*.webp', { eager: true })

export const LOCAL_STICKERS = Object.entries(stickerModules)
  .map(([path, mod]) => ({ name: path.split('/').pop(), url: mod.default }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getLocalUrl(filename) {
  return LOCAL_STICKERS.find(s => s.name === filename)?.url ?? null
}

// ─── URLs Supabase ────────────────────────────────────────────────────────────

const BUCKET = 'stickers'

export function getStickerUrl(filename) {
  // En dev : proxy Vite (même origine → pas de COEP)
  // En prod : URL Supabase directe (le bucket public sert Cross-Origin-Resource-Policy: cross-origin)
  if (import.meta.env.DEV) {
    return `/stickers-proxy/${filename}`
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

// ─── Listing distant ──────────────────────────────────────────────────────────

export async function listRemoteStickers() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(error.message)
  const files = (data ?? []).filter(f => f.name.endsWith('.webp'))
  return files.map(f => ({
    name: f.name,
    url:  getStickerUrl(f.name),
  }))
}
