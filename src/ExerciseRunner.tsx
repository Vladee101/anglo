import { useEffect, useRef, useState } from 'react'
import { isSkipped, type Modality, type Playlist, type StepResult } from './types'
import type { SpeechScorer } from './lib/speech'
import { pluralizeRu } from './lib/pluralRu'
import { Read } from './exercises/Read'
import { Listen } from './exercises/Listen'
import { Write } from './exercises/Write'
import { Speak } from './exercises/Speak'

interface Props {
  playlist: Playlist
  itemIndex: number
  modality: Modality
  scorer: SpeechScorer
  showTimer: boolean
  onDone: (result: StepResult) => void
}

/**
 * Hosts one exercise: owns the attempt counter and the clock, renders the
 * modality-specific UI, and shows a Continue bar once answered correctly.
 * Remounted (via key) for every item/modality change so state resets.
 */
export function ExerciseRunner({
  playlist,
  itemIndex,
  modality,
  scorer,
  showTimer,
  onDone,
}: Props) {
  const item = playlist.items[itemIndex]
  const isMixed = playlist.modalities.length > 1
  const [attempts, setAttempts] = useState(0)
  const [result, setResult] = useState<StepResult | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(performance.now())

  useEffect(() => {
    if (!showTimer || result) return
    const id = setInterval(
      () => setElapsedMs(performance.now() - startRef.current),
      200,
    )
    return () => clearInterval(id)
  }, [showTimer, result])

  const handleAttempt = (correct: boolean) => {
    if (result) return
    const total = attempts + 1
    setAttempts(total)
    if (correct)
      setResult({
        correct: true,
        attempts: total,
        ms: Math.round(performance.now() - startRef.current),
      })
  }

  const handleSkip = (reason: 'unsupported' | 'denied') => {
    if (result) return
    setResult({ skipped: true, reason })
  }

  return (
    <main className="app exercise">
      <header className="exercise-head">
        <span>
          Шаг {itemIndex + 1}/{playlist.items.length}
        </span>
        {(modality === 'read' || modality === 'listen') && (
          <span>Выберите правильный ответ</span>
        )}
        {isMixed && (
          <span className="modality-trail">
            {playlist.modalities.map((m) => (
              <span key={m} className={'chip' + (m === modality ? ' active' : '')}>
                {m}
              </span>
            ))}
          </span>
        )}
        {showTimer && (
          <span className="timer">
            {((result && !isSkipped(result) ? result.ms : elapsedMs) / 1000).toFixed(1)}s
          </span>
        )}
      </header>

      {modality === 'read' && (
        <Read
          item={item}
          pool={playlist.items}
          index={itemIndex}
          onAttempt={handleAttempt}
          done={result !== null}
        />
      )}
      {modality === 'listen' && (
        <Listen
          item={item}
          pool={playlist.items}
          index={itemIndex}
          onAttempt={handleAttempt}
          done={result !== null}
        />
      )}
      {modality === 'write' && (
        <Write item={item} onAttempt={handleAttempt} done={result !== null} />
      )}
      {modality === 'speak' && (
        <Speak
          item={item}
          isSeedStep={isMixed && itemIndex === 0}
          scorer={scorer}
          onAttempt={handleAttempt}
          onSkip={handleSkip}
          done={result !== null}
        />
      )}

      {result && (
        <div className="done-bar">
          <span>
            {isSkipped(result)
              ? `— Пропущено (${result.reason === 'unsupported' ? 'нет поддержки распознавания речи' : 'доступ к микрофону запрещён'})`
              : `✓ Верно · ${result.attempts} ${pluralizeRu(result.attempts, ['попытка', 'попытки', 'попыток'])} · ${(result.ms / 1000).toFixed(1)}s`}
          </span>
          <button className="primary" onClick={() => onDone(result)} autoFocus>
            Далее
          </button>
        </div>
      )}
    </main>
  )
}
