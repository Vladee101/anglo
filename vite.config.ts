import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const CHAINS_DIR = join(root, 'chains')
const DRILLS_DIR = join(root, 'drills')
const DICTIONARY_DIR = join(root, 'dictionary')
const PUBLIC_DIR = join(root, 'public')

mkdirSync(join(PUBLIC_DIR, 'chains'), { recursive: true })
cpSync(CHAINS_DIR, join(PUBLIC_DIR, 'chains'), { recursive: true })

mkdirSync(join(PUBLIC_DIR, 'drills'), { recursive: true })
if (existsSync(DRILLS_DIR)) cpSync(DRILLS_DIR, join(PUBLIC_DIR, 'drills'), { recursive: true })

mkdirSync(join(PUBLIC_DIR, 'dictionary'), { recursive: true })
if (existsSync(DICTIONARY_DIR)) cpSync(DICTIONARY_DIR, join(PUBLIC_DIR, 'dictionary'), { recursive: true })

interface ManifestEntry {
  id: string
  title_ru: string
  file: string
  progressive?: boolean
  reel_hook_ru?: string
}

function readJsonFiles(dir: string): { data: Record<string, unknown>; file: string }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ data: JSON.parse(readFileSync(join(dir, f), 'utf8')), file: f }))
}

const manifest: Record<string, ManifestEntry[]> = {
  mixed: [],
  read: [],
  listen: [],
  write: [],
  speak: [],
  dictionary: [],
}

for (const { data: chain, file } of readJsonFiles(CHAINS_DIR)) {
  manifest.mixed.push({
    id: chain.id as string,
    title_ru: chain.title_ru as string,
    file: `chains/${file}`,
    progressive: chain.progressive !== false,
    reel_hook_ru: typeof chain.reel_hook_ru === 'string' ? chain.reel_hook_ru : undefined,
  })
}

for (const { data: drill, file } of readJsonFiles(DRILLS_DIR)) {
  const bucket = manifest[drill.modality as string]
  bucket?.push({
    id: drill.id as string,
    title_ru: drill.title_ru as string,
    file: `drills/${file}`,
  })
}

for (const { data: dict, file } of readJsonFiles(DICTIONARY_DIR)) {
  manifest.dictionary.push({
    id: dict.id as string,
    title_ru: dict.title_ru as string,
    file: `dictionary/${file}`,
  })
}

writeFileSync(join(PUBLIC_DIR, 'content-manifest.json'), JSON.stringify(manifest, null, 2))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
