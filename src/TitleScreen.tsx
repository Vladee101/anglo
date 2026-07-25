import type { Level, ManifestEntry, Mode, Playlist, StepProgress } from './types'
import { findResume } from './lib/playlist'
import { pluralizeRu } from './lib/pluralRu'

interface Props {
  mode: Mode
  onModeChange: (mode: Mode) => void
  level: Level
  onLevelChange: (level: Level) => void
  bucket: ManifestEntry[]
  unit: ManifestEntry | null
  onUnitChange: (id: string) => void
  playlist: Playlist | null
  progress: StepProgress[]
  showTimer: boolean
  onToggleTimer: (value: boolean) => void
  onStart: () => void
  onReset: () => void
}

const MODE_OPTIONS: { mode: Mode; label: string }[] = [
  { mode: 'mixed', label: 'Mix' },
  { mode: 'read', label: 'Read' },
  { mode: 'listen', label: 'Listen' },
  { mode: 'write', label: 'Write' },
  { mode: 'speak', label: 'Speak' },
]

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function TitleScreen({
  mode,
  onModeChange,
  level,
  onLevelChange,
  bucket,
  unit,
  onUnitChange,
  playlist,
  progress,
  showTimer,
  onToggleTimer,
  onStart,
  onReset,
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
      </div>

      <div className="level-picker">
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            className={'level-option' + (lvl === level ? ' active' : '')}
            onClick={() => onLevelChange(lvl)}
          >
            {lvl}
          </button>
        ))}
      </div>

      {bucket.length === 0 && (
        <p className="notice">
          Материалы для этого уровня и режима пока не добавлены.
        </p>
      )}

      {bucket.length > 1 && !unit && (
        <ul className="unit-list">
          {bucket.map((u) => (
            <li key={u.id}>
              <button className="unit-option" onClick={() => onUnitChange(u.id)}>
                {u.title_ru}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unit && !playlist && <p className="muted">Загрузка…</p>}

      {unit && playlist && (
        <>
          <h1>{playlist.title_ru}</h1>
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

      <label className="setting">
        <input
          type="checkbox"
          checked={showTimer}
          onChange={(e) => onToggleTimer(e.target.checked)}
        />
        Показывать таймер
      </label>

      <p className="muted privacy-note">
        Упражнения "Говорить" используют встроенное распознавание речи
        браузера — голос обрабатывается сервисом распознавания речи вашего
        браузера.
      </p>
    </main>
  )
}
