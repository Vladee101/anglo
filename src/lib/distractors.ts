import { shuffle, type Rng } from './rng'

export interface DistractorCandidate {
  ru: string
  trap_distractors_ru?: string[]
}

/**
 * Pick exactly 3 wrong RU options for items[index].
 *
 * Candidate tiers, in priority order (shuffled within each tier by `rng`):
 *   1. earlier items' ru — content the learner has already seen
 *   2. the item's own trap_distractors_ru — covers the first item, which has
 *      no earlier siblings
 *   3. later items' ru — last resort for early items with few traps
 *
 * Never includes the item's own ru; deduped. Deterministic for a given rng.
 * Works over any ordered item list (chain steps or a flat drill's items).
 */
export function sampleDistractors(
  items: readonly DistractorCandidate[],
  index: number,
  rng: Rng,
): string[] {
  const item = items[index]
  const earlier = items.slice(0, index).map((s) => s.ru)
  const later = items.slice(index + 1).map((s) => s.ru)
  const traps = item.trap_distractors_ru ?? []

  const ranked = [
    ...shuffle(earlier, rng),
    ...shuffle(traps, rng),
    ...shuffle(later, rng),
  ]

  const picked: string[] = []
  for (const ru of ranked) {
    if (ru === item.ru || picked.includes(ru)) continue
    picked.push(ru)
    if (picked.length === 3) break
  }
  return picked
}
