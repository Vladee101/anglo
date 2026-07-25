import { isSkipped, type Playlist, type StepProgress } from './types'
import { pluralizeRu } from './lib/pluralRu'

interface Props {
  playlist: Playlist
  progress: StepProgress[]
  onBackToTitle: () => void
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

const formatMs = (ms: number) => {
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export function CompleteScreen({ playlist, progress, onBackToTitle }: Props) {
  const isMixed = playlist.modalities.length > 1
  const showSpeakColumn = playlist.modalities.includes('speak')
  const first = playlist.items[0]
  const last = playlist.items[playlist.items.length - 1]

  let totalMs = 0
  let totalAttempts = 0
  const perItem = playlist.items.map((item) => {
    const p = progress.find((sp) => sp.step_id === item.id)
    let ms = 0
    let attempts = 0
    for (const m of playlist.modalities) {
      const r = p?.results[m]
      if (r && !isSkipped(r)) {
        ms += r.ms
        attempts += r.attempts
      }
    }
    totalMs += ms
    totalAttempts += attempts
    const speak = p?.results.speak
    const speakSkipped = speak !== undefined && isSkipped(speak)
    return { item, ms, attempts, speakSkipped }
  })

  return (
    <main className="app complete-screen">
      <h1>Готово! 🎉</h1>

      {isMixed && (
        <>
          <div className="growth">
            <div className="growth-card">
              <p className="muted">Начали с:</p>
              <p className="en">{first.en}</p>
            </div>
            <span className="growth-arrow">→</span>
            <div className="growth-card">
              <p className="muted">Стало:</p>
              <p className="en">{last.en}</p>
            </div>
          </div>
          <p className="growth-line">
            Было {wordCount(first.en)}{' '}
            {pluralizeRu(wordCount(first.en), ['слово', 'слова', 'слов'])} — стало{' '}
            {wordCount(last.en)} {pluralizeRu(wordCount(last.en), ['слово', 'слова', 'слов'])}.
          </p>
        </>
      )}

      <p className="totals">
        Общее время: <strong>{formatMs(totalMs)}</strong> · Всего попыток:{' '}
        <strong>{totalAttempts}</strong>
      </p>

      <table className="summary">
        <thead>
          <tr>
            <th>Шаг</th>
            <th>Попытки</th>
            <th>Время</th>
            {showSpeakColumn && <th>Speak</th>}
          </tr>
        </thead>
        <tbody>
          {perItem.map(({ item, ms, attempts, speakSkipped }) => (
            <tr key={item.id}>
              <td>{item.en}</td>
              <td>{attempts}</td>
              <td>{formatMs(ms)}</td>
              {showSpeakColumn && (
                <td className="speak-status" title={speakSkipped ? 'Пропущено' : 'Выполнено'}>
                  {speakSkipped ? '—' : '✓'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <button className="primary" onClick={onBackToTitle}>
        На главный экран
      </button>
    </main>
  )
}
