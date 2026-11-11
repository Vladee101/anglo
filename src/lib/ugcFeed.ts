import { isSkipped, type Chain, type Playlist, type SnowballPost, type StepProgress } from '../types'

const UGC_FEED_KEY = 'esl-ugc-snowball-feed'
const UGC_CHAINS_KEY = 'esl-ugc-custom-chains'

const SEED_POSTS: SnowballPost[] = [
  {
    id: 'seed-1',
    unitId: 'want-water',
    unitTitle: 'Снежный ком: Хочу ледяной воды!',
    username: 'Vlad',
    totalAttempts: 24,
    idealAttempts: 24,
    accuracyPct: 100,
    rank: 'S',
    firstEn: 'I want',
    lastEn: 'I really want to drink cold water right now',
    wordGrowth: [2, 9],
    comment: 'Прошёл весь ком с 2 до 9 слов без единой ошибки! Кто повторит вслух с 1-го дубля? 🧊🔥',
    createdAt: '2026-11-10',
    likes: 42,
  },
  {
    id: 'seed-2',
    unitId: 'want-water',
    unitTitle: 'Снежный ком: Хочу ледяной воды!',
    username: 'Anton',
    totalAttempts: 27,
    idealAttempts: 24,
    accuracyPct: 89,
    rank: 'A',
    firstEn: 'I want',
    lastEn: 'I really want to drink cold water right now',
    wordGrowth: [2, 9],
    comment: 'На 5-м шаге язык заплелся на слове really 😂 Но дожал!',
    createdAt: '2026-11-11',
    likes: 19,
  },
]

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export function computeSnowballStats(playlist: Playlist, progress: StepProgress[]) {
  const idealAttempts = playlist.items.length * playlist.modalities.length
  let totalAttempts = 0
  for (const item of playlist.items) {
    const p = progress.find((sp) => sp.step_id === item.id)
    for (const m of playlist.modalities) {
      const r = p?.results[m]
      if (r && !isSkipped(r)) {
        totalAttempts += r.attempts
      } else {
        totalAttempts += 1
      }
    }
  }
  const effectiveTotal = Math.max(totalAttempts, idealAttempts)
  const accuracyPct =
    idealAttempts > 0 ? Math.min(100, Math.round((idealAttempts / effectiveTotal) * 100)) : 100
  const rank: 'S' | 'A' | 'B' | 'C' =
    accuracyPct === 100 ? 'S' : accuracyPct >= 85 ? 'A' : accuracyPct >= 70 ? 'B' : 'C'

  const firstEn = playlist.items[0]?.en ?? ''
  const lastEn = playlist.items[playlist.items.length - 1]?.en ?? ''
  const wordGrowth: [number, number] = [countWords(firstEn), countWords(lastEn)]

  return {
    totalAttempts: effectiveTotal,
    idealAttempts,
    accuracyPct,
    rank,
    firstEn,
    lastEn,
    wordGrowth,
  }
}

export function loadSnowballFeed(unitId?: string): SnowballPost[] {
  try {
    const raw = localStorage.getItem(UGC_FEED_KEY)
    const userPosts: SnowballPost[] = raw ? (JSON.parse(raw) as SnowballPost[]) : []
    const combined = [...userPosts, ...SEED_POSTS]
    return unitId ? combined.filter((p) => p.unitId === unitId) : combined
  } catch {
    return unitId ? SEED_POSTS.filter((p) => p.unitId === unitId) : SEED_POSTS
  }
}

export function publishSnowballPost(post: Omit<SnowballPost, 'id' | 'createdAt' | 'likes'>): SnowballPost {
  const created: SnowballPost = {
    ...post,
    id: `ugc-${Date.now()}`,
    createdAt: new Date().toISOString().slice(0, 10),
    likes: 1,
  }
  try {
    const raw = localStorage.getItem(UGC_FEED_KEY)
    const existing: SnowballPost[] = raw ? (JSON.parse(raw) as SnowballPost[]) : []
    localStorage.setItem(UGC_FEED_KEY, JSON.stringify([created, ...existing]))
  } catch {
    // ignore storage errors
  }
  return created
}

export function likeSnowballPost(postId: string): void {
  try {
    const raw = localStorage.getItem(UGC_FEED_KEY)
    const existing: SnowballPost[] = raw ? (JSON.parse(raw) as SnowballPost[]) : []
    const updated = existing.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    localStorage.setItem(UGC_FEED_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

/** Load user-created custom Snowball chains stored locally. */
export function loadCustomChains(): Chain[] {
  try {
    const raw = localStorage.getItem(UGC_CHAINS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Chain[]) : []
  } catch {
    return []
  }
}

/** Save a user-created custom Snowball chain. */
export function saveCustomChain(chain: Chain): Chain[] {
  const existing = loadCustomChains().filter((c) => c.id !== chain.id)
  const next = [chain, ...existing]
  try {
    localStorage.setItem(UGC_CHAINS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}
