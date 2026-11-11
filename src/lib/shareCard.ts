import type { Playlist } from '../types'

export interface ShareCardPayload {
  username: string
  playlist: Playlist
  totalAttempts: number
  accuracyPct: number
  rank: 'S' | 'A' | 'B' | 'C'
  comment?: string
}

/**
 * Generates a 1080x1920 (9:16 Reels / Stories) PNG data URL showcasing
 * the learner's completed Snowball chain and score.
 */
export function renderSnowballCardDataUrl(payload: ShareCardPayload): string | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920)
  grad.addColorStop(0, '#0f172a')
  grad.addColorStop(0.5, '#1e3a8a')
  grad.addColorStop(1, '#172554')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1080, 1920)

  // Header badge
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
  ctx.fillText('👾 АнглоMonster · Снежный ком', 80, 140)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 58px system-ui, -apple-system, sans-serif'
  ctx.fillText(payload.playlist.title_ru.slice(0, 34), 80, 230)

  // User + Rank box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(80, 280, 920, 180)
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif'
  ctx.fillText(`Ранг ${payload.rank}`, 120, 390)

  ctx.fillStyle = '#e2e8f0'
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    `@${payload.username} · Точность ${payload.accuracyPct}% · Попыток: ${payload.totalAttempts}`,
    360,
    385,
  )

  // Snowball steps ladder
  ctx.fillStyle = '#93c5fd'
  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif'
  ctx.fillText('Эволюция фразы (от простого к сложному):', 80, 535)

  const maxSteps = Math.min(payload.playlist.items.length, 7)
  let y = 600
  for (let i = 0; i < maxSteps; i++) {
    const step = payload.playlist.items[i]
    ctx.fillStyle = i === maxSteps - 1 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(80, y, 920, 115)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${i + 1}. ${step.en.slice(0, 44)}`, 110, y + 50)

    ctx.fillStyle = '#cbd5e1'
    ctx.font = '28px system-ui, -apple-system, sans-serif'
    ctx.fillText(step.ru.slice(0, 52), 110, y + 92)
    y += 135
  }

  // Comment if provided
  if (payload.comment?.trim()) {
    ctx.fillStyle = '#fde047'
    ctx.font = 'italic 34px system-ui, -apple-system, sans-serif'
    ctx.fillText(`«${payload.comment.trim().slice(0, 50)}»`, 80, 1640)
  }

  // Footer CTA
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif'
  ctx.fillText('🔥 Слабо пройти быстрее? Ссылка в описании!', 80, 1780)

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export function downloadSnowballCard(payload: ShareCardPayload): boolean {
  const dataUrl = renderSnowballCardDataUrl(payload)
  if (!dataUrl) return false
  const link = document.createElement('a')
  link.download = `anglo-snowball-${payload.playlist.id}.png`
  link.href = dataUrl
  link.click()
  return true
}
