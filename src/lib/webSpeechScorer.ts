import type { QuizItem } from '../types'
import type { SpeechFailure, SpeechScoreResult, SpeechScorer } from './speech'
import { matchLoose } from './match'
import { getSpeechRecognition } from './speechSupport'

const TIMEOUT_MS = 8000

function mapError(error: string): SpeechFailure {
  if (error === 'no-speech') return 'no-speech'
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'denied'
  return 'error'
}

/**
 * SpeechScorer backed by the browser's Web Speech API (ADR-0001).
 * One recognition instance per score() call; a second call while one is
 * pending aborts the first.
 */
export function createWebSpeechScorer(): SpeechScorer {
  let abortPending: (() => void) | null = null

  return {
    score(item: QuizItem, isSeedStep: boolean): Promise<SpeechScoreResult> {
      abortPending?.()

      const Recognition = getSpeechRecognition()
      if (!Recognition)
        return Promise.resolve({
          transcript: '',
          correct: false,
          failure: 'unavailable',
        })

      return new Promise((resolve) => {
        const recognition = new Recognition()
        recognition.lang = 'en-US'
        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = 3

        let settled = false
        const settle = (result: SpeechScoreResult) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          recognition.onresult = null
          recognition.onerror = null
          recognition.onend = null
          try {
            recognition.abort()
          } catch {
            // recognition already stopped
          }
          if (abortPending === abort) abortPending = null
          resolve(result)
        }

        const abort = () =>
          settle({ transcript: '', correct: false, failure: 'error' })
        abortPending = abort

        const timer = setTimeout(
          () => settle({ transcript: '', correct: false, failure: 'no-speech' }),
          TIMEOUT_MS,
        )

        recognition.onresult = (ev) => {
          const alternatives = Array.from(ev.results[0] ?? [])
          const transcript = alternatives[0]?.transcript ?? ''
          const correct = alternatives.some((alt) =>
            matchLoose(alt.transcript, item.accepted_en, isSeedStep),
          )
          settle({ transcript, correct })
        }
        recognition.onerror = (ev) =>
          settle({ transcript: '', correct: false, failure: mapError(ev.error) })
        // Some browsers end silently without a result or an error event.
        recognition.onend = () =>
          settle({ transcript: '', correct: false, failure: 'no-speech' })

        try {
          recognition.start()
        } catch {
          settle({ transcript: '', correct: false, failure: 'error' })
        }
      })
    },
  }
}
