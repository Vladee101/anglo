import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebSpeechScorer } from '../webSpeechScorer'
import type { Step } from '../../types'

class MockRecognition {
  static instances: MockRecognition[] = []

  lang = ''
  continuous = true
  interimResults = true
  maxAlternatives = 1
  aborted = false
  startCalls = 0
  onresult: ((ev: SpeechRecognitionEvent) => void) | null = null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null = null
  onend: (() => void) | null = null

  constructor() {
    MockRecognition.instances.push(this)
  }

  start() {
    this.startCalls++
  }

  stop() {}

  abort() {
    this.aborted = true
  }

  emitResult(transcripts: string[]) {
    this.onresult?.({
      results: [transcripts.map((transcript) => ({ transcript }))],
      resultIndex: 0,
    } as unknown as SpeechRecognitionEvent)
  }

  emitError(error: string) {
    this.onerror?.({ error } as unknown as SpeechRecognitionErrorEvent)
  }
}

let ctor: (new () => SpeechRecognition) | null = null

vi.mock('../speechSupport', () => ({
  getSpeechRecognition: () => ctor,
}))

const step: Step = {
  id: 'want-water.2',
  en: 'I want water',
  ru: 'Я хочу воды',
  accepted_en: ['I want water', 'I want some water'],
  new_part: 'water',
  audio: 'audio/want-water.2.mp3',
}

beforeEach(() => {
  MockRecognition.instances = []
  ctor = MockRecognition as unknown as new () => SpeechRecognition
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createWebSpeechScorer', () => {
  it('configures a fresh recognition per call', async () => {
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)
    const rec = MockRecognition.instances[0]

    expect(rec.lang).toBe('en-US')
    expect(rec.continuous).toBe(false)
    expect(rec.interimResults).toBe(false)
    expect(rec.maxAlternatives).toBe(3)
    expect(rec.startCalls).toBe(1)

    rec.emitResult(['i want water'])
    await pending
  })

  it('passes when any of several alternatives matches', async () => {
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)

    MockRecognition.instances[0].emitResult([
      'i wonder about her',
      'i want water',
      'banana',
    ])

    const result = await pending
    expect(result.correct).toBe(true)
    expect(result.transcript).toBe('i wonder about her') // always alternatives[0]
    expect(result.failure).toBeUndefined()
  })

  it('fails without a failure code when no alternative matches', async () => {
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)

    MockRecognition.instances[0].emitResult(['good morning'])

    const result = await pending
    expect(result.correct).toBe(false)
    expect(result.transcript).toBe('good morning')
    expect(result.failure).toBeUndefined()
  })

  it("maps a no-speech error to failure 'no-speech'", async () => {
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)

    MockRecognition.instances[0].emitError('no-speech')

    const result = await pending
    expect(result).toEqual({ transcript: '', correct: false, failure: 'no-speech' })
  })

  it("maps not-allowed and service-not-allowed to failure 'denied'", async () => {
    const scorer = createWebSpeechScorer()

    const first = scorer.score(step, false)
    MockRecognition.instances[0].emitError('not-allowed')
    expect((await first).failure).toBe('denied')

    const second = scorer.score(step, false)
    MockRecognition.instances[1].emitError('service-not-allowed')
    expect((await second).failure).toBe('denied')
  })

  it("maps unknown errors to failure 'error'", async () => {
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)

    MockRecognition.instances[0].emitError('network')

    expect((await pending).failure).toBe('error')
  })

  it('times out after 8s, aborts recognition, and resolves no-speech', async () => {
    vi.useFakeTimers()
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(step, false)
    const rec = MockRecognition.instances[0]

    vi.advanceTimersByTime(8000)

    const result = await pending
    expect(result).toEqual({ transcript: '', correct: false, failure: 'no-speech' })
    expect(rec.aborted).toBe(true)
  })

  it('a second score() call aborts the pending first call', async () => {
    const scorer = createWebSpeechScorer()
    const first = scorer.score(step, false)
    const second = scorer.score(step, false)

    const firstResult = await first
    expect(firstResult.correct).toBe(false)
    expect(firstResult.failure).toBe('error')
    expect(MockRecognition.instances[0].aborted).toBe(true)

    MockRecognition.instances[1].emitResult(['i want some water'])
    expect((await second).correct).toBe(true)
  })

  it('uses the seed starts-with rule through matchLoose', async () => {
    const seedStep: Step = {
      ...step,
      id: 'want-water.1',
      en: 'I want',
      accepted_en: ['I want'],
      new_part: 'I want',
    }
    const scorer = createWebSpeechScorer()
    const pending = scorer.score(seedStep, true)

    MockRecognition.instances[0].emitResult(['i want to go home now'])

    expect((await pending).correct).toBe(true)
  })

  it("resolves failure 'unavailable' when recognition is not constructible", async () => {
    ctor = null
    const scorer = createWebSpeechScorer()

    const result = await scorer.score(step, false)
    expect(result).toEqual({ transcript: '', correct: false, failure: 'unavailable' })
  })
})
