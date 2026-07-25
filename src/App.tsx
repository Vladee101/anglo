import { useEffect, useMemo, useState } from 'react'
import type { Chain, Drill, Level, Manifest, ManifestEntry, Mode, Playlist, StepResult } from './types'
import { MODALITIES } from './modalities'
import { findResume, withResult } from './lib/playlist'
import { createWebSpeechScorer } from './lib/webSpeechScorer'
import {
  clearProgress,
  loadLevel,
  loadMode,
  loadProgress,
  loadShowTimer,
  saveLevel,
  saveMode,
  saveProgress,
  saveShowTimer,
} from './lib/storage'
import { TitleScreen } from './TitleScreen'
import { CompleteScreen } from './CompleteScreen'
import { ExerciseRunner } from './ExerciseRunner'
import { Header } from './Header'
import { Footer } from './Footer'

const MANIFEST_URL = `${import.meta.env.BASE_URL}content-manifest.json`
const MODES: readonly Mode[] = ['mixed', 'read', 'listen', 'write', 'speak']

function isManifest(x: unknown): x is Manifest {
  if (typeof x !== 'object' || x === null) return false
  const m = x as Record<string, unknown>
  return MODES.every((k) => Array.isArray(m[k]))
}

function isChain(x: unknown): x is Chain {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  if (typeof c.id !== 'string' || typeof c.title_ru !== 'string') return false
  if (!Array.isArray(c.steps) || c.steps.length === 0) return false
  return c.steps.every((s) => {
    if (typeof s !== 'object' || s === null) return false
    const step = s as Record<string, unknown>
    return (
      typeof step.id === 'string' &&
      typeof step.en === 'string' &&
      typeof step.ru === 'string' &&
      Array.isArray(step.accepted_en) &&
      step.accepted_en.length > 0
    )
  })
}

function isDrill(x: unknown): x is Drill {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Record<string, unknown>
  if (typeof d.id !== 'string' || typeof d.title_ru !== 'string') return false
  if (typeof d.modality !== 'string') return false
  if (!Array.isArray(d.items) || d.items.length === 0) return false
  return d.items.every((it) => {
    if (typeof it !== 'object' || it === null) return false
    const item = it as Record<string, unknown>
    return (
      typeof item.id === 'string' &&
      typeof item.en === 'string' &&
      typeof item.ru === 'string' &&
      Array.isArray(item.accepted_en) &&
      item.accepted_en.length > 0
    )
  })
}

async function fetchPlaylist(mode: Mode, unit: ManifestEntry): Promise<Playlist> {
  const res = await fetch(`${import.meta.env.BASE_URL}${unit.file}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  if (mode === 'mixed') {
    if (!isChain(data)) throw new Error('chain JSON has unexpected shape')
    return {
      id: data.id,
      title_ru: data.title_ru,
      level: data.level,
      items: data.steps,
      modalities: MODALITIES,
    }
  }
  if (!isDrill(data)) throw new Error('drill JSON has unexpected shape')
  return {
    id: data.id,
    title_ru: data.title_ru,
    level: data.level,
    items: data.items,
    modalities: [mode],
  }
}

type Screen = 'loading' | 'error' | 'title' | 'play' | 'complete'

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('loading')
  const [mode, setMode] = useState<Mode>(loadMode)
  const [level, setLevel] = useState<Level>(loadLevel)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [progress, setProgress] = useState<ReturnType<typeof loadProgress>>([])
  const [pos, setPos] = useState({ itemIndex: 0, modIndex: 0 })
  const [showTimer, setShowTimer] = useState(loadShowTimer)
  const scorer = useMemo(() => createWebSpeechScorer(), [])

  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: unknown) => {
        if (cancelled) return
        if (!isManifest(data)) throw new Error('content manifest has unexpected shape')
        setManifest(data)
        setScreen('title')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
        setScreen('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const bucket = (manifest?.[mode] ?? []).filter((u) => u.level === level)
  const unit = bucket.length === 1 ? bucket[0] : (bucket.find((u) => u.id === unitId) ?? null)

  // (Re)load the resolved unit's content + progress whenever it changes.
  useEffect(() => {
    if (!unit) {
      setPlaylist(null)
      return
    }
    let cancelled = false
    fetchPlaylist(mode, unit)
      .then((loaded) => {
        if (cancelled) return
        setPlaylist(loaded)
        setProgress(loadProgress(loaded.id))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
        setScreen('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, unit?.id])

  if (screen === 'loading')
    return (
      <>
        <Header />
        <main className="app">Загрузка…</main>
        <Footer />
      </>
    )
  if (screen === 'error' || !manifest)
    return (
      <>
        <Header />
        <main className="app">
          <p className="notice">Не удалось загрузить материал: {loadError}</p>
        </main>
        <Footer />
      </>
    )

  const changeMode = (next: Mode) => {
    setMode(next)
    saveMode(next)
    setUnitId(null)
  }

  const changeLevel = (next: Level) => {
    setLevel(next)
    saveLevel(next)
    setUnitId(null)
  }

  const start = () => {
    if (!playlist) return
    const resume = findResume(playlist, progress)
    if (resume === null) {
      setScreen('complete')
    } else {
      setPos(resume)
      setScreen('play')
    }
  }

  const reset = () => {
    if (!playlist) return
    clearProgress(playlist.id)
    setProgress([])
  }

  const toggleTimer = (value: boolean) => {
    setShowTimer(value)
    saveShowTimer(value)
  }

  const handleExerciseDone = (result: StepResult) => {
    if (!playlist) return
    const item = playlist.items[pos.itemIndex]
    const modality = playlist.modalities[pos.modIndex]
    const next = withResult(progress, item.id, modality, result)
    setProgress(next)
    saveProgress(playlist.id, next)

    if (pos.modIndex + 1 < playlist.modalities.length) {
      setPos({ ...pos, modIndex: pos.modIndex + 1 })
    } else if (pos.itemIndex + 1 < playlist.items.length) {
      setPos({ itemIndex: pos.itemIndex + 1, modIndex: 0 })
    } else {
      setScreen('complete')
    }
  }

  const content =
    screen === 'complete' && playlist ? (
      <CompleteScreen
        playlist={playlist}
        progress={progress}
        onBackToTitle={() => setScreen('title')}
      />
    ) : screen === 'play' && playlist ? (
      <ExerciseRunner
        key={`${playlist.id}:${pos.itemIndex}:${playlist.modalities[pos.modIndex]}`}
        playlist={playlist}
        itemIndex={pos.itemIndex}
        modality={playlist.modalities[pos.modIndex]}
        scorer={scorer}
        showTimer={showTimer}
        onDone={handleExerciseDone}
      />
    ) : (
      <TitleScreen
        mode={mode}
        onModeChange={changeMode}
        level={level}
        onLevelChange={changeLevel}
        bucket={bucket}
        unit={unit}
        onUnitChange={setUnitId}
        playlist={playlist}
        progress={progress}
        showTimer={showTimer}
        onToggleTimer={toggleTimer}
        onStart={start}
        onReset={reset}
      />
    )

  return (
    <>
      <Header />
      {content}
      <Footer />
    </>
  )
}
