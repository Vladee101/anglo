import type { Chain, ChallengeContext, Mode } from '../types'

const VALID_MODES: readonly Mode[] = ['mixed', 'read', 'listen', 'write', 'speak']

export type DemoSpeechMode = 'live' | 'pass' | 'funny-fail'

export interface DeepLinkState {
  mode: Mode | null
  unitId: string | null
  studio: boolean
  demoSpeech: DemoSpeechMode
  challenge: ChallengeContext | null
  sharedChain: Chain | null
}

/** Encode a UTF-8 JSON object to URL-safe base64 for sharing custom UGC chains. */
export function encodeChainPayload(chain: Chain): string {
  try {
    const json = JSON.stringify(chain)
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return ''
  }
}

/** Decode a URL-safe base64 custom UGC chain payload. */
export function decodeChainPayload(encoded: string): Chain | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as Chain
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.id === 'string' &&
      typeof parsed.title_ru === 'string' &&
      Array.isArray(parsed.steps) &&
      parsed.steps.length >= 2
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function parseDeepLink(search: string = window.location.search): DeepLinkState {
  const params = new URLSearchParams(search)
  const rawMode = params.get('mode') as Mode | null
  const mode = rawMode && VALID_MODES.includes(rawMode) ? rawMode : null
  const unitId = params.get('unit')
  const studio = params.get('studio') === '1' || params.get('studio') === 'true'
  const rawDemo = params.get('demo')
  const demoSpeech: DemoSpeechMode =
    rawDemo === 'pass' || rawDemo === 'funny-fail' ? rawDemo : 'live'

  const challenger = params.get('challenger')
  const targetAttemptsRaw = params.get('targetAttempts')
  const targetAttempts = targetAttemptsRaw ? Number.parseInt(targetAttemptsRaw, 10) : NaN
  const comment = params.get('comment') ?? undefined

  const challenge: ChallengeContext | null =
    challenger && unitId && Number.isFinite(targetAttempts) && targetAttempts > 0
      ? { challenger, targetAttempts, unitId, comment }
      : null

  const chainParam = params.get('chainData')
  const sharedChain = chainParam ? decodeChainPayload(chainParam) : null

  return {
    mode: sharedChain ? 'mixed' : challenge ? mode ?? 'mixed' : mode,
    unitId: sharedChain ? sharedChain.id : unitId,
    studio,
    demoSpeech,
    challenge,
    sharedChain,
  }
}

export function buildChallengeUrl(opts: {
  unitId: string
  mode?: Mode
  challenger: string
  targetAttempts: number
  comment?: string
  sharedChain?: Chain
}): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://anglo.app/'
  const params = new URLSearchParams()
  params.set('mode', opts.mode ?? 'mixed')
  params.set('unit', opts.unitId)
  params.set('challenger', opts.challenger)
  params.set('targetAttempts', String(opts.targetAttempts))
  if (opts.comment?.trim()) params.set('comment', opts.comment.trim())
  if (opts.sharedChain) {
    const encoded = encodeChainPayload(opts.sharedChain)
    if (encoded) params.set('chainData', encoded)
  }
  return `${base}?${params.toString()}`
}

export function buildReelDeepLink(unitId: string, mode: Mode = 'mixed', studio = false): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://anglo.app/'
  const params = new URLSearchParams()
  params.set('mode', mode)
  params.set('unit', unitId)
  if (studio) params.set('studio', '1')
  return `${base}?${params.toString()}`
}
