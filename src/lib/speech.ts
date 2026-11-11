import type { QuizItem } from '../types'

export type SpeechFailure = 'no-speech' | 'denied' | 'unavailable' | 'error'

export interface SpeechScoreResult {
  transcript: string
  correct: boolean
  /** Present when scoring did not produce a usable answer. */
  failure?: SpeechFailure
}

export interface SpeechScorer {
  score(item: QuizItem, isSeedStep: boolean): Promise<SpeechScoreResult>
}

/** Test double: always "hears" a correct answer after 500ms. */
export const stubScorer: SpeechScorer = {
  score: (): Promise<SpeechScoreResult> =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ transcript: '(stub)', correct: true }), 500),
    ),
}

const FUNNY_RUNGLISH_TRANSCRIPTS: Record<string, string> = {
  'I want': 'ай вонт пельмени плиз',
  'I want water': 'I want vodka with ice',
  'I want to drink water': 'ай вонт ту дринк квас',
  'I want to drink cold water': 'I want to drink boiling tea in July',
  'I really want to drink cold water': 'май инглиш из вери гуд гив ми вотер',
  'I really want to drink cold water right now': 'лет ми спик фром май харт вотер нау',
}

/**
 * Studio / Reel recording scorer: lets a content creator deterministically
 * trigger either a funny Runglish recognition fail or a clean pass on camera.
 */
export function createDemoScorer(mode: 'pass' | 'funny-fail'): SpeechScorer {
  return {
    score(item: QuizItem): Promise<SpeechScoreResult> {
      return new Promise((resolve) =>
        setTimeout(() => {
          if (mode === 'pass') {
            resolve({ transcript: item.en, correct: true })
          } else {
            const funny =
              FUNNY_RUNGLISH_TRANSCRIPTS[item.en] ??
              `Give me ${item.en.toLowerCase()} comrade`
            resolve({ transcript: funny, correct: false })
          }
        }, 450),
      )
    },
  }
}
