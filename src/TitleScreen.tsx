import type { ChallengeContext, ManifestEntry, Mode, Playlist, StepProgress } from './types'
import { findResume } from './lib/playlist'
import { pluralizeRu } from './lib/pluralRu'

interface Props {
  mode: Mode
  onModeChange: (mode: Mode) => void
  bucket: ManifestEntry[]
  unit: ManifestEntry | null
  onUnitChange: (id: string) => void
  onBackToList: () => void
  playlist: Playlist | null
  progress: StepProgress[]
  onStart: () => void
  onReset: () => void
  onOpenDictionary: () => void
  onOpenCreator?: () => void
  challenge?: ChallengeContext | null
}

const MODE_OPTIONS: { mode: Mode; label: string }[] = [
  { mode: 'mixed', label: 'Mix' },
  { mode: 'read', label: 'Read' },
  { mode: 'listen', label: 'Listen' },
  { mode: 'write', label: 'Write' },
  { mode: 'speak', label: 'Speak' },
]

export function TitleScreen({
  mode,
  onModeChange,
  bucket,
  unit,
  onUnitChange,
  onBackToList,
  playlist,
  progress,
  onStart,
  onReset,
  onOpenDictionary,
  onOpenCreator,
  challenge = null,
}: Props) {
  const hasProgress = progress.length > 0
  const allDone = playlist !== null && findResume(playlist, progress) === null

  return (
    <main className="app title-screen">
      <div className="mode-picker">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            className={'mode-option' + (opt.mode === mode ? ' active' : '')}
            onClick={() => onModeChange(opt.mode)}
          >
            {opt.label}
          </button>
        ))}
        <button className="mode-option" onClick={onOpenDictionary}>
          Словарь
        </button>
        {onOpenCreator && (
          <button className="mode-option ugc-creator-btn" onClick={onOpenCreator}>
            ⛄️ + Свой ком
          </button>
        )}
      </div>

      {challenge && (
        <div className="challenge-banner">
          <strong>
            🔥 Вызов от @{challenge.challenger}: пройди этот Снежный ком максимум за{' '}
            {challenge.targetAttempts}{' '}
            {pluralizeRu(challenge.targetAttempts, ['попытку', 'попытки', 'попыток'])}!
          </strong>
          {challenge.comment && <p className="muted">«{challenge.comment}»</p>}
        </div>
      )}

      {bucket.length === 0 && (
        <p className="notice">
          Материалы для этого режима пока не добавлены.
        </p>
      )}

      {bucket.length > 1 && !unit && (
        <ul className="unit-list">
          {bucket.map((u) => (
            <li key={u.id}>
              <button className="unit-option" onClick={() => onUnitChange(u.id)}>
                <span>{u.title_ru}</span>
                {u.progressive && <span className="snowball-badge">⛄️ Снежный ком</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unit && bucket.length > 1 && (
        <button className="subtle" onClick={onBackToList}>
          ← Назад к списку
        </button>
      )}

      {unit && !playlist && <p className="muted">Загрузка…</p>}

      {unit && playlist && (
        <>
          <h1>{playlist.title_ru}</h1>
          {playlist.reel_hook_ru && (
            <p className="reel-hook-preview">🎬 {playlist.reel_hook_ru}</p>
          )}
          <p className="muted">
            {playlist.items.length}{' '}
            {pluralizeRu(playlist.items.length, ['шаг', 'шага', 'шагов'])} ·{' '}
            {playlist.modalities.join(' → ')}
          </p>

          <button className="primary" onClick={onStart}>
            {allDone && hasProgress
              ? 'Посмотреть результаты'
              : hasProgress
                ? 'Продолжить'
                : 'Начать'}
          </button>

          {hasProgress && (
            <button className="subtle" onClick={onReset}>
              Сбросить прогресс
            </button>
          )}
        </>
      )}
    </main>
  )
}
