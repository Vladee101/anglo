import type { Level, Mode, StepProgress } from '../types'

const progressKey = (id: string) => `esl-progress:${id}`
const SETTINGS_KEY = 'esl-settings'

export function loadProgress(id: string): StepProgress[] {
  try {
    const raw = localStorage.getItem(progressKey(id))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StepProgress[]) : []
  } catch {
    return []
  }
}

export function saveProgress(id: string, progress: StepProgress[]): void {
  localStorage.setItem(progressKey(id), JSON.stringify(progress))
}

export function clearProgress(id: string): void {
  localStorage.removeItem(progressKey(id))
}

interface Settings {
  showTimer: boolean
  mode: Mode
  level: Level
}

function loadSettings(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {}
  } catch {
    return {}
  }
}

function saveSettings(patch: Partial<Settings>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...patch }))
}

export function loadShowTimer(): boolean {
  return loadSettings().showTimer === true
}

export function saveShowTimer(showTimer: boolean): void {
  saveSettings({ showTimer })
}

export function loadMode(): Mode {
  return loadSettings().mode ?? 'mixed'
}

export function saveMode(mode: Mode): void {
  saveSettings({ mode })
}

export function loadLevel(): Level {
  return loadSettings().level ?? 'A1'
}

export function saveLevel(level: Level): void {
  saveSettings({ level })
}
