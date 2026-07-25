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
