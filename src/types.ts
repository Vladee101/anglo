export type Modality = 'read' | 'listen' | 'write' | 'speak'

/** Shared shape consumed by every exercise component, regardless of source. */
export interface QuizItem {
  id: string
  en: string
  ru: string
  accepted_en: string[]
  trap_distractors_ru?: string[]
  audio?: string
}

export interface Chain {
  id: string
  title_ru: string
  steps: Step[]
}

/** A chain step: additive/progressive content, played in Mixed mode. */
export interface Step extends QuizItem {
  new_part: string
  audio: string
}

/** A flat, standalone drill item for one of the single-skill modes. */
export interface DrillItem extends QuizItem {}

/** A single-skill drill: one modality, an independent (non-chained) item list. */
export interface Drill {
  id: string
  title_ru: string
  modality: Modality
  items: DrillItem[]
}

/**
 * The one shape exercise-running UI operates on, built at runtime from
 * either a Chain (modalities = all 4) or a Drill (modalities = [modality]).
 */
export interface Playlist {
  id: string
  title_ru: string
  items: QuizItem[]
  modalities: readonly Modality[]
}

/** A mode is Mixed (all 4 modalities) or a single-skill drill modality. */
export type Mode = 'mixed' | Modality

/** One entry in the build-time content manifest (public/content-manifest.json). */
export interface ManifestEntry {
  id: string
  title_ru: string
  file: string
}

export type Manifest = Record<Mode, ManifestEntry[]>

export interface ExerciseResult {
  correct: boolean
  attempts: number
  ms: number
}

/** A speak exercise the learner could not do (no STT support / mic denied). */
export interface SkippedResult {
  skipped: true
  reason: 'unsupported' | 'denied'
}

export type StepResult = ExerciseResult | SkippedResult

export function isSkipped(result: StepResult): result is SkippedResult {
  return 'skipped' in result
}

export interface StepProgress {
  step_id: string
  results: Partial<Record<Modality, StepResult>>
}
