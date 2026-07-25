import { useState } from 'react'
import type { QuizItem } from '../types'
import type { SpeechFailure, SpeechScoreResult, SpeechScorer } from '../lib/speech'
import { getSpeechRecognition } from '../lib/speechSupport'

interface Props {
  item: QuizItem
  isSeedStep: boolean
  scorer: SpeechScorer
  onAttempt: (correct: boolean) => void
  onSkip: (reason: 'unsupported' | 'denied') => void
  done: boolean
}

type Phase = 'idle' | 'listening' | 'denied'

/** Retryable-failure copy; null means the result was a normal pass/fail. */
function retryHint(failure: SpeechFailure | undefined): string | null {
  if (failure === 'no-speech') return 'Не удалось распознать речь — попробуйте ещё раз.'
  if (failure === 'error' || failure === 'unavailable')
    return 'Проблема с микрофоном — попробуйте ещё раз.'
  return null
}

export function Speak({ item, isSeedStep, scorer, onAttempt, onSkip, done }: Props) {
  const [supported] = useState(() => getSpeechRecognition() !== null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [last, setLast] = useState<SpeechScoreResult | null>(null)

  const record = async () => {
    if (phase === 'listening' || done) return
    setPhase('listening')
    const result = await scorer.score(item, isSeedStep)
    setLast(result)
    if (result.failure === 'denied') {
      setPhase('denied')
      return
    }
    setPhase('idle')
    onAttempt(result.correct)
  }

  if (!supported)
    return (
      <div className="speak">
        <p className="ru">{item.ru}</p>
        <p className="notice">Распознавание речи не поддерживается в этом браузере.</p>
        <button className="primary" disabled={done} onClick={() => onSkip('unsupported')}>
          Далее
        </button>
      </div>
    )

  if (phase === 'denied')
    return (
      <div className="speak">
        <p className="ru">{item.ru}</p>
        <p className="notice">
          Доступ к микрофону запрещён, поэтому это упражнение нельзя оценить.
        </p>
        <button className="primary" disabled={done} onClick={() => onSkip('denied')}>
          Далее
        </button>
      </div>
    )

  const hint = last ? retryHint(last.failure) : null

  return (
    <div className="speak">
      <p className="ru">{item.ru}</p>
      <p className="muted">Скажите по-английски:</p>
      <button
        className="primary"
        onClick={record}
        disabled={phase === 'listening' || done}
      >
        {phase === 'listening' ? 'Слушаю…' : '🎤 Записать'}
      </button>
      {last && !hint && (
        <p className="feedback">
          Услышано: «{last.transcript}» —{' '}
          {last.correct ? (
            '✓ верно'
          ) : (
            <>
              ✗ попробуйте ещё раз. Правильный ответ: <strong>{item.en}</strong>
            </>
          )}
        </p>
      )}
      {hint && <p className="feedback">{hint}</p>}
    </div>
  )
}
