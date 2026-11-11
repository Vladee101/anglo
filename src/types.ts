export type Modality = 'read' | 'listen' | 'write' | 'speak'

/** Shared shape consumed by every exercise component, regardless of source. */
export interface QuizItem {
  id: string
  en: string
  ru: string
  accepted_en: string[]
  trap_distractors_ru?: string[]
  /** Funny mascot reactions keyed by trap distractor string (for Reels/Shorts). */
  trap_reactions_ru?: Record<string, string>
  /** Optional funny note or cultural tip shown after completing the item. */
  funny_note_ru?: string
  audio?: string
  /** Newly added words on this step in a progressive snowball chain. */
  new_part?: string
}

export interface Chain {
  id: string
  title_ru: string
  /** True (default) for additive chains built word-by-word; false for a flat
   *  phrase list that's just walked through all 4 modalities per item. */
  progressive?: boolean
  /** Optional hook banner displayed at the top of 9:16 Studio/Reel mode. */
  reel_hook_ru?: string
  /** Optional author username for user-generated (UGC) snowball chains. */
  author?: string
  steps: Step[]
}

/** A chain step: content played across all 4 modalities in Mixed mode. */
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
  progressive?: boolean
  reel_hook_ru?: string
  author?: string
}

/** A mode is Mixed (all 4 modalities) or a single-skill drill modality. */
export type Mode = 'mixed' | Modality

/** One entry in the build-time content manifest (public/content-manifest.json). */
export interface ManifestEntry {
  id: string
  title_ru: string
  file: string
  progressive?: boolean
  reel_hook_ru?: string
}

export type Manifest = Record<Mode, ManifestEntry[]> & { dictionary: ManifestEntry[] }

/** One word/phrase reference card in a dictionary lesson. */
export interface DictionaryEntry {
  id: string
  en: string
  meaning_ru: string
  example_en: string
  example_ru: string
  mistakes_ru: string
}

/** A read-only reference lesson (bound to a chain/drill topic), not a quiz. */
export interface Dictionary {
  id: string
  title_ru: string
  entries: DictionaryEntry[]
}

export interface ExerciseResult {
  correct: boolean
  attempts: number
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

/** Viral challenge parameters passed via deep link when a user shares their Snowball run. */
export interface ChallengeContext {
  challenger: string
  targetAttempts: number
  unitId: string
  comment?: string
}

/** A published UGC Snowball completion record in the community feed. */
export interface SnowballPost {
  id: string
  unitId: string
  unitTitle: string
  username: string
  totalAttempts: number
  idealAttempts: number
  accuracyPct: number
  rank: 'S' | 'A' | 'B' | 'C'
  firstEn: string
  lastEn: string
  wordGrowth: [number, number]
  comment: string
  createdAt: string
  likes: number
}
