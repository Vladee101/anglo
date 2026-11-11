import { useState } from 'react'
import { isSkipped, type Modality, type Playlist, type StepResult } from './types'
import type { SpeechScorer } from './lib/speech'
import type { DemoSpeechMode } from './lib/urlParams'
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
  onDone: (result: StepResult) => void
  onExit: () => void
  studioMode?: boolean
  demoSpeech?: DemoSpeechMode
  onDemoSpeechChange?: (mode: DemoSpeechMode) => void
}

/**
 * Hosts one exercise: owns the attempt counter, renders the modality-specific
 * UI, and shows a Continue bar once answered correctly. Remounted (via key)
 * for every item/modality change so state resets.
 */
export function ExerciseRunner({
  playlist,
  itemIndex,
  modality,
  scorer,
  onDone,
  onExit,
  studioMode = false,
  demoSpeech = 'live',
  onDemoSpeechChange,
}: Props) {
  const item = playlist.items[itemIndex]
  const isMixed = playlist.modalities.length > 1
  const isProgressive = isMixed && playlist.progressive !== false
  const [attempts, setAttempts] = useState(0)
  const [result, setResult] = useState<StepResult | null>(null)
  const [customHook, setCustomHook] = useState(
    playlist.reel_hook_ru ?? `🔥 Снежный ком: шаг ${itemIndex + 1} из ${playlist.items.length}`,
  )

  const handleAttempt = (correct: boolean) => {
    if (result) return
    const total = attempts + 1
    setAttempts(total)
    if (correct) setResult({ correct: true, attempts: total })
  }

  const handleSkip = (reason: 'unsupported' | 'denied') => {
    if (result) return
    setResult({ skipped: true, reason })
  }

  return (
    <main className={'app exercise' + (studioMode ? ' studio-frame' : '')}>
      {studioMode && (
        <div className="reel-hook-banner">
          <input
            type="text"
            className="reel-hook-input"
            value={customHook}
            onChange={(e) => setCustomHook(e.target.value)}
            aria-label="Заголовок хука для рилса"
          />
          {modality === 'speak' && onDemoSpeechChange && (
            <div className="studio-stt-controls">
              <span>Дубль речи:</span>
              <button
                type="button"
                className={'chip-btn' + (demoSpeech === 'live' ? ' active' : '')}
                onClick={() => onDemoSpeechChange('live')}
              >
                🎙 Микрофон
              </button>
              <button
                type="button"
                className={'chip-btn' + (demoSpeech === 'funny-fail' ? ' active' : '')}
                onClick={() => onDemoSpeechChange('funny-fail')}
              >
                🤡 Смешной фейл
              </button>
              <button
                type="button"
                className={'chip-btn' + (demoSpeech === 'pass' ? ' active' : '')}
                onClick={() => onDemoSpeechChange('pass')}
              >
                ✅ Идеально
              </button>
            </div>
          )}
        </div>
      )}

      <header className="exercise-head">
        {!studioMode && (
          <button className="subtle exit-button" onClick={onExit}>
            ← Выйти
          </button>
        )}
        <span className="step-counter">
          {isProgressive ? '⛄️ Ком' : 'Шаг'} {itemIndex + 1}/{playlist.items.length}
        </span>
        {isProgressive && item.new_part && (
          <span className="snowball-new-part" title="Новое слово в снежном коме">
            +{item.new_part}
          </span>
        )}
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
              : `✓ Верно · ${result.attempts} ${pluralizeRu(result.attempts, ['попытка', 'попытки', 'попыток'])}`}
          </span>
          <button className="primary" onClick={() => onDone(result)} autoFocus>
            Далее
          </button>
        </div>
      )}
    </main>
  )
}
