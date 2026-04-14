/**
 * upload-stickers.mjs
 *
 * Charge tous les stickers .webp depuis src/assets/stickers/
 * vers le bucket Supabase "stickers".
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/upload-stickers.mjs
 *
 * La SUPABASE_URL est lue depuis .env.local (VITE_SUPABASE_URL).
 * La SERVICE_ROLE_KEY doit être passée en variable d'environnement
 * (Settings > API > service_role dans le dashboard Supabase).
 *
 * Options :
 *   --dry-run   Affiche ce qui serait uploadé sans rien faire
 *   --force     Réupload même les fichiers déjà présents (upsert)
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// ── Lecture .env.local ────────────────────────────────────────────────────────

const __dir     = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dir, '..')
const envPath   = join(ROOT, '.env.local')

async function readEnv(path) {
  try {
    const content = await readFile(path, 'utf-8')
    const map = {}
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
      if (m) map[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return map
  } catch {
    return {}
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const env            = await readEnv(envPath)
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL   ?? env.VITE_SUPABASE_URL
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE   = process.argv.includes('--force')
const BUCKET  = 'stickers'
const STICKERS_DIR = join(ROOT, 'src', 'assets', 'stickers')

if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL manquant dans .env.local')
  process.exit(1)
}
if (!SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY manquant')
  console.error('    Passe-la via : SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/upload-stickers.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── Création du bucket ────────────────────────────────────────────────────────

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Impossible de lister les buckets : ${error.message}`)

  const exists = buckets.some(b => b.name === BUCKET)
  if (exists) {
    console.log(`✓  Bucket "${BUCKET}" existe déjà`)
    return
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Création du bucket "${BUCKET}" (public: true)`)
    return
  }

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,           // URLs publiques pour affichage dans l'app
    fileSizeLimit: 512000,  // 500 Ko max par sticker
    allowedMimeTypes: ['image/webp', 'image/png', 'image/gif'],
  })
  if (createErr) throw new Error(`Création du bucket échouée : ${createErr.message}`)
  console.log(`✓  Bucket "${BUCKET}" créé`)
}

// ── Upload des stickers ───────────────────────────────────────────────────────

async function uploadStickers() {
  const files = (await readdir(STICKERS_DIR)).filter(f => f.endsWith('.webp'))
  console.log(`\n📦  ${files.length} stickers à traiter\n`)

  // Fichiers déjà présents dans le bucket (pour skip si pas --force)
  let existing = new Set()
  if (!FORCE) {
    const { data: list } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
    existing = new Set((list ?? []).map(f => f.name))
  }

  let uploaded = 0
  let skipped  = 0
  let errors   = 0

  for (const filename of files) {
    if (!FORCE && existing.has(filename)) {
      process.stdout.write(`  ↷  ${filename} (déjà présent)\n`)
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] upload → ${filename}`)
      uploaded++
      continue
    }

    try {
      const buffer = await readFile(join(STICKERS_DIR, filename))
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, {
          contentType: 'image/webp',
          upsert: FORCE,
        })

      if (error) {
        console.error(`  ✗  ${filename} — ${error.message}`)
        errors++
      } else {
        process.stdout.write(`  ✓  ${filename}\n`)
        uploaded++
      }
    } catch (e) {
      console.error(`  ✗  ${filename} — ${e.message}`)
      errors++
    }
  }

  console.log(`\n─────────────────────────────────────────`)
  console.log(`  ✓ Uploadés  : ${uploaded}`)
  console.log(`  ↷ Ignorés   : ${skipped}`)
  if (errors > 0) console.log(`  ✗ Erreurs   : ${errors}`)
  console.log(`─────────────────────────────────────────`)

  if (!DRY_RUN) {
    const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
    console.log(`\n🔗  URL de base : ${baseUrl}<filename.webp>`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

try {
  if (DRY_RUN) console.log('⚠️   Mode dry-run — aucune modification\n')
  await ensureBucket()
  await uploadStickers()
} catch (e) {
  console.error(`\n💥  ${e.message}`)
  process.exit(1)
}
