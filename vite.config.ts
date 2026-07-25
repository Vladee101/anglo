import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const CHAINS_DIR = join(root, 'chains')
const DRILLS_DIR = join(root, 'drills')
const PUBLIC_DIR = join(root, 'public')

// Plain copy step: chains/*.json (and drills/*.json) -> public/ so the app
// can fetch them at runtime. Runs whenever this config loads (dev, build,
// preview, test).
mkdirSync(join(PUBLIC_DIR, 'chains'), { recursive: true })
cpSync(CHAINS_DIR, join(PUBLIC_DIR, 'chains'), { recursive: true })

mkdirSync(join(PUBLIC_DIR, 'drills'), { recursive: true })
if (existsSync(DRILLS_DIR)) cpSync(DRILLS_DIR, join(PUBLIC_DIR, 'drills'), { recursive: true })

interface ManifestEntry {
  id: string
  title_ru: string
  level: string
  file: string
}

function readJsonFiles(dir: string): { data: Record<string, unknown>; file: string }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ data: JSON.parse(readFileSync(join(dir, f), 'utf8')), file: f }))
}

// Build a manifest of available content per mode, since a static app can't
// list a directory at runtime. Buckets: "mixed" (from chains/*.json) and
// "read"/"listen"/"write"/"speak" (from drills/*.json, grouped by each
// file's own `modality` field).
const manifest: Record<string, ManifestEntry[]> = {
  mixed: [],
  read: [],
  listen: [],
  write: [],
  speak: [],
}

for (const { data: chain, file } of readJsonFiles(CHAINS_DIR)) {
  manifest.mixed.push({
    id: chain.id as string,
    title_ru: chain.title_ru as string,
    level: chain.level as string,
    file: `chains/${file}`,
  })
}

for (const { data: drill, file } of readJsonFiles(DRILLS_DIR)) {
  const bucket = manifest[drill.modality as string]
  bucket?.push({
    id: drill.id as string,
    title_ru: drill.title_ru as string,
    level: drill.level as string,
    file: `drills/${file}`,
  })
}

writeFileSync(join(PUBLIC_DIR, 'content-manifest.json'), JSON.stringify(manifest, null, 2))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
