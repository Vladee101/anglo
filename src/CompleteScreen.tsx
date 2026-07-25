import { isSkipped, type Playlist, type StepProgress } from './types'
import { pluralizeRu } from './lib/pluralRu'

interface Props {
  playlist: Playlist
  progress: StepProgress[]
  onBackToTitle: () => void
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export function CompleteScreen({ playlist, progress, onBackToTitle }: Props) {
  const isMixed = playlist.modalities.length > 1
  const showSpeakColumn = playlist.modalities.includes('speak')
  const first = playlist.items[0]
  const last = playlist.items[playlist.items.length - 1]

  let totalAttempts = 0
  const perItem = playlist.items.map((item) => {
    const p = progress.find((sp) => sp.step_id === item.id)
    let attempts = 0
    for (const m of playlist.modalities) {
      const r = p?.results[m]
      if (r && !isSkipped(r)) attempts += r.attempts
    }
    totalAttempts += attempts
    const speak = p?.results.speak
    const speakSkipped = speak !== undefined && isSkipped(speak)
    return { item, attempts, speakSkipped }
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
        Всего попыток: <strong>{totalAttempts}</strong>
      </p>

      <table className="summary">
        <thead>
          <tr>
            <th>Шаг</th>
            <th>Попытки</th>
            {showSpeakColumn && <th>Speak</th>}
          </tr>
        </thead>
        <tbody>
          {perItem.map(({ item, attempts, speakSkipped }) => (
            <tr key={item.id}>
              <td>{item.en}</td>
              <td>{attempts}</td>
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
