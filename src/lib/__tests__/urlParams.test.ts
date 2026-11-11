import { describe, expect, it } from 'vitest'
import {
  buildChallengeUrl,
  decodeChainPayload,
  encodeChainPayload,
  parseDeepLink,
} from '../urlParams'
import type { Chain } from '../../types'

const sampleChain: Chain = {
  id: 'ugc-coffee',
  title_ru: 'Снежный ком: Кофе',
  progressive: true,
  reel_hook_ru: 'Хук для рилса',
  steps: [
    {
      id: 'ugc-coffee.1',
      en: 'I need coffee',
      ru: 'Мне нужен кофе',
      accepted_en: ['I need coffee'],
      new_part: 'I need coffee',
      trap_distractors_ru: ['A', 'B', 'C'],
      audio: 'audio/ugc-coffee.1.mp3',
    },
    {
      id: 'ugc-coffee.2',
      en: 'I need iced coffee',
      ru: 'Мне нужен айс-кофе',
      accepted_en: ['I need iced coffee'],
      new_part: 'iced',
      trap_distractors_ru: ['D'],
      audio: 'audio/ugc-coffee.2.mp3',
    },
  ],
}

describe('urlParams & UGC deep links', () => {
  it('parses studio and demo speech parameters', () => {
    const state = parseDeepLink('?mode=mixed&unit=want-water&studio=1&demo=funny-fail')
    expect(state.mode).toBe('mixed')
    expect(state.unitId).toBe('want-water')
    expect(state.studio).toBe(true)
    expect(state.demoSpeech).toBe('funny-fail')
  })

  it('parses challenge parameters', () => {
    const state = parseDeepLink(
      '?mode=mixed&unit=want-water&challenger=Vlad&targetAttempts=24&comment=Beat+me',
    )
    expect(state.challenge).toEqual({
      challenger: 'Vlad',
      targetAttempts: 24,
      unitId: 'want-water',
      comment: 'Beat me',
    })
  })

  it('encodes and decodes custom UGC snowball chains losslessly', () => {
    const encoded = encodeChainPayload(sampleChain)
    expect(encoded.length).toBeGreaterThan(10)
    const decoded = decodeChainPayload(encoded)
    expect(decoded).toEqual(sampleChain)
  })

  it('builds a full challenge URL with embedded custom chain', () => {
    const url = buildChallengeUrl({
      unitId: sampleChain.id,
      challenger: 'Vlad',
      targetAttempts: 8,
      sharedChain: sampleChain,
    })
    const query = url.slice(url.indexOf('?'))
    const parsed = parseDeepLink(query)
    expect(parsed.sharedChain?.title_ru).toBe('Снежный ком: Кофе')
    expect(parsed.challenge?.challenger).toBe('Vlad')
  })
})
