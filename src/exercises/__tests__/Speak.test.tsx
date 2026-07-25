// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Speak } from '../Speak'
import type { SpeechScoreResult, SpeechScorer } from '../../lib/speech'
import type { Step } from '../../types'

let supported = true
vi.mock('../../lib/speechSupport', () => ({
  getSpeechRecognition: () => (supported ? (class {} as unknown) : null),
}))

afterEach(() => {
  cleanup()
  supported = true
})

const item: Step = {
  id: 'want-water.1',
  en: 'I want',
  ru: 'Я хочу',
  accepted_en: ['I want'],
  new_part: 'I want',
  audio: 'audio/want-water.1.mp3',
}

function makeScorer(result: SpeechScoreResult): SpeechScorer {
  return { score: () => Promise.resolve(result) }
}

describe('Speak', () => {
  it('unsupported browsers show a notice and Далее records skipped(unsupported)', () => {
    supported = false
    const onAttempt = vi.fn()
    const onSkip = vi.fn()

    render(
      <Speak
        item={item}
        isSeedStep
        scorer={makeScorer({ transcript: '', correct: false })}
        onAttempt={onAttempt}
        onSkip={onSkip}
        done={false}
      />,
    )

    expect(screen.getByText(/не поддерживается/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /далее/i }))

    expect(onSkip).toHaveBeenCalledWith('unsupported')
    expect(onAttempt).not.toHaveBeenCalled()
  })

  it('a denied mic shows a notice and Далее records skipped(denied)', async () => {
    const onAttempt = vi.fn()
    const onSkip = vi.fn()

    render(
      <Speak
        item={item}
        isSeedStep
        scorer={makeScorer({ transcript: '', correct: false, failure: 'denied' })}
        onAttempt={onAttempt}
        onSkip={onSkip}
        done={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /записать/i }))
    await screen.findByRole('button', { name: /далее/i })

    fireEvent.click(screen.getByRole('button', { name: /далее/i }))

    expect(onSkip).toHaveBeenCalledWith('denied')
    expect(onAttempt).not.toHaveBeenCalled()
  })

  it('a no-speech failure shows a retry hint, calls onAttempt(false), and stays interactive', async () => {
    const onAttempt = vi.fn()

    render(
      <Speak
        item={item}
        isSeedStep
        scorer={makeScorer({ transcript: '', correct: false, failure: 'no-speech' })}
        onAttempt={onAttempt}
        onSkip={vi.fn()}
        done={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /записать/i }))
    await screen.findByText(/попробуйте ещё раз/i)

    expect(onAttempt).toHaveBeenCalledWith(false)
    const recordButton = screen.getByRole('button', {
      name: /записать/i,
    }) as HTMLButtonElement
    expect(recordButton.disabled).toBe(false)
  })

  it('a correct result calls onAttempt(true) and shows the transcript', async () => {
    const onAttempt = vi.fn()

    render(
      <Speak
        item={item}
        isSeedStep
        scorer={makeScorer({ transcript: 'i want', correct: true })}
        onAttempt={onAttempt}
        onSkip={vi.fn()}
        done={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /записать/i }))
    await screen.findByText(/верно/i)

    expect(onAttempt).toHaveBeenCalledWith(true)
  })

  it('a plain wrong guess reveals the correct answer and calls onAttempt(false)', async () => {
    const onAttempt = vi.fn()

    render(
      <Speak
        item={item}
        isSeedStep
        scorer={makeScorer({ transcript: 'hello there', correct: false })}
        onAttempt={onAttempt}
        onSkip={vi.fn()}
        done={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /записать/i }))
    await screen.findByText(/попробуйте ещё раз/i)

    expect(onAttempt).toHaveBeenCalledWith(false)
    expect(screen.getByText(item.en)).toBeTruthy()
  })
})
