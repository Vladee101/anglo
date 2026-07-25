import { isSkipped, type Modality, type Playlist, type StepProgress, type StepResult } from '../types'

export interface Position {
  itemIndex: number
  modIndex: number
}

/** First (item, modality) not yet answered correctly or skipped; null when all done. */
export function findResume(playlist: Playlist, progress: StepProgress[]): Position | null {
  for (let i = 0; i < playlist.items.length; i++) {
    const itemProgress = progress.find((p) => p.step_id === playlist.items[i].id)
    for (let m = 0; m < playlist.modalities.length; m++) {
      const r = itemProgress?.results[playlist.modalities[m]]
      const done = r !== undefined && (isSkipped(r) || r.correct)
      if (!done) return { itemIndex: i, modIndex: m }
    }
  }
  return null
}

/** Merge one modality's result into an item's progress record. */
export function withResult(
  progress: StepProgress[],
  stepId: string,
  modality: Modality,
  result: StepResult,
): StepProgress[] {
  const existing = progress.find((p) => p.step_id === stepId)
  if (!existing)
    return [...progress, { step_id: stepId, results: { [modality]: result } }]
  return progress.map((p) =>
    p.step_id === stepId
      ? { ...p, results: { ...p.results, [modality]: result } }
      : p,
  )
}
