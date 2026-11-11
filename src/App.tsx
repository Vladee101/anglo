import { useEffect, useMemo, useState } from 'react'
import type { Chain, Drill, Manifest, ManifestEntry, Mode, Playlist, StepResult } from './types'
import { MODALITIES } from './modalities'
import { findResume, withResult } from './lib/playlist'
import { createWebSpeechScorer } from './lib/webSpeechScorer'
import { createDemoScorer } from './lib/speech'
import { clearProgress, loadMode, loadProgress, saveMode, saveProgress } from './lib/storage'
import { clearAuthUser, loadAuthUser, saveAuthUser } from './lib/auth'
import { parseDeepLink, type DemoSpeechMode } from './lib/urlParams'
import { loadCustomChains, saveCustomChain } from './lib/ugcFeed'
import { TitleScreen } from './TitleScreen'
import { CompleteScreen } from './CompleteScreen'
import { ExerciseRunner } from './ExerciseRunner'
import { DictionaryScreen } from './DictionaryScreen'
import { LoginScreen } from './LoginScreen'
import { SnowballCreatorScreen } from './SnowballCreatorScreen'
import { Header } from './Header'
import { Footer } from './Footer'

const MANIFEST_URL = `${import.meta.env.BASE_URL}content-manifest.json`
const MODES: readonly Mode[] = ['mixed', 'read', 'listen', 'write', 'speak']

function isManifest(x: unknown): x is Manifest {
  if (typeof x !== 'object' || x === null) return false
  const m = x as Record<string, unknown>
  return MODES.every((k) => Array.isArray(m[k])) && Array.isArray(m.dictionary)
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

function chainToPlaylist(data: Chain): Playlist {
  return {
    id: data.id,
    title_ru: data.title_ru,
    items: data.steps,
    modalities: MODALITIES,
    progressive: data.progressive,
    reel_hook_ru: data.reel_hook_ru,
    author: data.author,
  }
}

async function fetchPlaylist(
  mode: Mode,
  unit: ManifestEntry,
  customChains: Chain[],
): Promise<Playlist> {
  if (mode === 'mixed') {
    const custom = customChains.find((c) => c.id === unit.id)
    if (custom) return chainToPlaylist(custom)
  }
  const res = await fetch(`${import.meta.env.BASE_URL}${unit.file}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  if (mode === 'mixed') {
    if (!isChain(data)) throw new Error('chain JSON has unexpected shape')
    return chainToPlaylist(data)
  }
  if (!isDrill(data)) throw new Error('drill JSON has unexpected shape')
  return {
    id: data.id,
    title_ru: data.title_ru,
    items: data.items,
    modalities: [mode],
  }
}

type Screen = 'loading' | 'error' | 'title' | 'play' | 'complete'

export default function App() {
  const deepLink = useMemo(() => parseDeepLink(), [])
  const [authUser, setAuthUser] = useState<string | null>(() => loadAuthUser() ?? 'Guest')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [studioMode, setStudioMode] = useState<boolean>(deepLink.studio)
  const [demoSpeech, setDemoSpeech] = useState<DemoSpeechMode>(deepLink.demoSpeech)
  const [customChains, setCustomChains] = useState<Chain[]>(() => {
    const existing = loadCustomChains()
    if (deepLink.sharedChain && !existing.some((c) => c.id === deepLink.sharedChain?.id)) {
      return saveCustomChain(deepLink.sharedChain)
    }
    return existing
  })

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('loading')
  const [mode, setMode] = useState<Mode>(() => deepLink.mode ?? loadMode())
  const [unitId, setUnitId] = useState<string | null>(() => deepLink.unitId)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [progress, setProgress] = useState<ReturnType<typeof loadProgress>>([])
  const [pos, setPos] = useState({ itemIndex: 0, modIndex: 0 })
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)

  const webScorer = useMemo(() => createWebSpeechScorer(), [])
  const scorer = useMemo(() => {
    if (demoSpeech === 'pass' || demoSpeech === 'funny-fail') {
      return createDemoScorer(demoSpeech)
    }
    return webScorer
  }, [demoSpeech, webScorer])

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

  const bucket = useMemo(() => {
    const base = manifest?.[mode] ?? []
    if (mode !== 'mixed') return base
    const customEntries: ManifestEntry[] = customChains.map((c) => ({
      id: c.id,
      title_ru: c.title_ru,
      file: `custom/${c.id}.json`,
      progressive: true,
      reel_hook_ru: c.reel_hook_ru,
    }))
    return [...customEntries, ...base]
  }, [manifest, mode, customChains])

  const unit = bucket.length === 1 ? bucket[0] : (bucket.find((u) => u.id === unitId) ?? null)

  // (Re)load the resolved unit's content + progress whenever it changes.
  useEffect(() => {
    if (!unit) {
      setPlaylist(null)
      return
    }
    let cancelled = false
    fetchPlaylist(mode, unit, customChains)
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
  }, [mode, unit?.id, customChains])

  const handleLogin = (username: string) => {
    saveAuthUser(username)
    setAuthUser(username)
    setShowLoginModal(false)
  }

  const handleLogout = () => {
    clearAuthUser()
    setAuthUser(null)
    setShowLoginModal(true)
  }

  if (!authUser || showLoginModal)
    return (
      <>
        <Header studioMode={studioMode} onToggleStudio={() => setStudioMode((s) => !s)} />
        <LoginScreen onLogin={handleLogin} />
        <Footer />
      </>
    )

  if (screen === 'loading')
    return (
      <>
        <Header
          user={authUser}
          onLogout={handleLogout}
          studioMode={studioMode}
          onToggleStudio={() => setStudioMode((s) => !s)}
        />
        <main className="app">Загрузка…</main>
        <Footer />
      </>
    )
  if (screen === 'error' || !manifest)
    return (
      <>
        <Header
          user={authUser}
          onLogout={handleLogout}
          studioMode={studioMode}
          onToggleStudio={() => setStudioMode((s) => !s)}
        />
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

  const handleSaveCustomChain = (chain: Chain) => {
    const updated = saveCustomChain(chain)
    setCustomChains(updated)
    setCreatorOpen(false)
    setMode('mixed')
    setUnitId(chain.id)
    setPlaylist(chainToPlaylist(chain))
    setProgress([])
    setPos({ itemIndex: 0, modIndex: 0 })
    setScreen('play')
  }

  const activeCustomChain = customChains.find((c) => c.id === playlist?.id) ?? null

  const content = creatorOpen ? (
    <SnowballCreatorScreen
      author={authUser}
      onSaveAndPlay={handleSaveCustomChain}
      onClose={() => setCreatorOpen(false)}
    />
  ) : dictionaryOpen ? (
    <DictionaryScreen bucket={manifest.dictionary} onClose={() => setDictionaryOpen(false)} />
  ) : screen === 'complete' && playlist ? (
    <CompleteScreen
      playlist={playlist}
      progress={progress}
      onBackToTitle={() => setScreen('title')}
      user={authUser}
      challenge={deepLink.challenge}
      sharedChain={activeCustomChain}
    />
  ) : screen === 'play' && playlist ? (
    <ExerciseRunner
      key={`${playlist.id}:${pos.itemIndex}:${playlist.modalities[pos.modIndex]}`}
      playlist={playlist}
      itemIndex={pos.itemIndex}
      modality={playlist.modalities[pos.modIndex]}
      scorer={scorer}
      onDone={handleExerciseDone}
      onExit={() => setScreen('title')}
      studioMode={studioMode}
      demoSpeech={demoSpeech}
      onDemoSpeechChange={setDemoSpeech}
    />
  ) : (
    <TitleScreen
      mode={mode}
      onModeChange={changeMode}
      bucket={bucket}
      unit={unit}
      onUnitChange={setUnitId}
      onBackToList={() => setUnitId(null)}
      playlist={playlist}
      progress={progress}
      onStart={start}
      onReset={reset}
      onOpenDictionary={() => setDictionaryOpen(true)}
      onOpenCreator={() => setCreatorOpen(true)}
      challenge={deepLink.challenge}
    />
  )

  return (
    <div className={studioMode ? 'studio-shell' : undefined}>
      <Header
        user={authUser}
        onLogout={handleLogout}
        studioMode={studioMode}
        onToggleStudio={() => setStudioMode((s) => !s)}
      />
      {content}
      {!studioMode && <Footer />}
    </div>
  )
}
