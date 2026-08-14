import { useEffect, useState } from 'react'
import type { Dictionary, ManifestEntry } from './types'

interface Props {
  bucket: ManifestEntry[]
  onClose: () => void
}

function isDictionary(x: unknown): x is Dictionary {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.title_ru !== 'string') return false
  if (!Array.isArray(d.entries) || d.entries.length === 0) return false
  return d.entries.every((e) => {
    if (typeof e !== 'object' || e === null) return false
    const entry = e as Record<string, unknown>
    return (
      typeof entry.id === 'string' &&
      typeof entry.en === 'string' &&
      typeof entry.meaning_ru === 'string' &&
      typeof entry.example_en === 'string' &&
      typeof entry.example_ru === 'string' &&
      typeof entry.mistakes_ru === 'string'
    )
  })
}

export function DictionaryScreen({ bucket, onClose }: Props) {
  const [unitId, setUnitId] = useState<string | null>(null)
  const [dict, setDict] = useState<Dictionary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const unit = bucket.length === 1 ? bucket[0] : (bucket.find((u) => u.id === unitId) ?? null)

  useEffect(() => {
    if (!unit) {
      setDict(null)
      return
    }
    let cancelled = false
    setLoadError(null)
    fetch(`${import.meta.env.BASE_URL}${unit.file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: unknown) => {
        if (cancelled) return
        if (!isDictionary(data)) throw new Error('dictionary JSON has unexpected shape')
        setDict(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [unit])

  return (
    <main className="app title-screen">
      <button className="subtle" onClick={onClose}>
        ← Назад
      </button>

      <h1>Словарь</h1>

      {bucket.length === 0 && (
        <p className="notice">Материалы словаря пока не добавлены.</p>
      )}

      {bucket.length > 1 && !unit && (
        <ul className="unit-list">
          {bucket.map((u) => (
            <li key={u.id}>
              <button className="unit-option" onClick={() => setUnitId(u.id)}>
                {u.title_ru}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unit && bucket.length > 1 && (
        <button className="subtle" onClick={() => setUnitId(null)}>
          ← Назад к списку
        </button>
      )}

      {unit && loadError && (
        <p className="notice">Не удалось загрузить словарь: {loadError}</p>
      )}

      {unit && !dict && !loadError && <p className="muted">Загрузка…</p>}

      {unit && dict && (
        <>
          <h2>{dict.title_ru}</h2>
          <ul className="dict-list">
            {dict.entries.map((entry) => (
              <li key={entry.id} className="dict-card">
                <p className="en dict-word">{entry.en}</p>
                <p className="dict-meaning">{entry.meaning_ru}</p>
                <p className="dict-example">
                  <span className="dict-example-en">{entry.example_en}</span>
                  <br />
                  <span className="muted">{entry.example_ru}</span>
                </p>
                <p className="dict-mistakes">⚠️ {entry.mistakes_ru}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
