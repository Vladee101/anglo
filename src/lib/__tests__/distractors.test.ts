import { describe, expect, it } from 'vitest'
import { sampleDistractors } from '../distractors'
import { mulberry32 } from '../rng'
import type { Chain } from '../../types'

// Small progressive chain fixture, kept local to this test so it doesn't
// depend on any particular file under chains/ existing.
const chain: Chain = {
  id: 'want-water',
  title_ru: 'Я хочу...',
  progressive: true,
  steps: [
    {
      id: 'want-water.1', en: 'I want', ru: 'Я хочу', accepted_en: ['I want'],
      new_part: 'I want', trap_distractors_ru: ['Я хотел', 'Ты хочешь', 'Я могу'],
      audio: 'audio/want-water.1.mp3',
    },
    {
      id: 'want-water.2', en: 'I want water', ru: 'Я хочу воды',
      accepted_en: ['I want water', 'I want some water'], new_part: 'water',
      trap_distractors_ru: ['Я хочу чаю'], audio: 'audio/want-water.2.mp3',
    },
    {
      id: 'want-water.3', en: 'I want to drink water', ru: 'Я хочу выпить воды',
      accepted_en: ['I want to drink water', 'I want to drink some water'], new_part: 'to drink',
      trap_distractors_ru: ['Я хочу пить'], audio: 'audio/want-water.3.mp3',
    },
    {
      id: 'want-water.4', en: 'I want to drink cold water', ru: 'Я хочу выпить холодной воды',
      accepted_en: ['I want to drink cold water', 'I want to drink some cold water'], new_part: 'cold',
      trap_distractors_ru: ['Я хочу выпить горячей воды'], audio: 'audio/want-water.4.mp3',
    },
    {
      id: 'want-water.5', en: 'I really want to drink cold water', ru: 'Я очень хочу выпить холодной воды',
      accepted_en: ['I really want to drink cold water'], new_part: 'really',
      trap_distractors_ru: ['Я очень хотел выпить холодной воды'], audio: 'audio/want-water.5.mp3',
    },
    {
      id: 'want-water.6', en: 'I really want to drink cold water right now',
      ru: 'Я очень хочу выпить холодной воды прямо сейчас',
      accepted_en: ['I really want to drink cold water right now', 'I really want to drink cold water now'],
      new_part: 'right now', trap_distractors_ru: ['Я очень хочу выпить холодной воды завтра'],
      audio: 'audio/want-water.6.mp3',
    },
  ],
}

describe('sampleDistractors', () => {
  it('returns exactly 3 options for every step', () => {
    chain.steps.forEach((_, i) => {
      expect(sampleDistractors(chain.steps, i, mulberry32(1))).toHaveLength(3)
    })
  })

  it('never includes the correct ru', () => {
    for (let seed = 1; seed <= 25; seed++) {
      chain.steps.forEach((step, i) => {
        const picked = sampleDistractors(chain.steps, i, mulberry32(seed))
        expect(picked).not.toContain(step.ru)
      })
    }
  })

  it('never returns duplicates', () => {
    for (let seed = 1; seed <= 25; seed++) {
      chain.steps.forEach((_, i) => {
        const picked = sampleDistractors(chain.steps, i, mulberry32(seed))
        expect(new Set(picked).size).toBe(3)
      })
    }
  })

  it('is deterministic for a given rng seed', () => {
    chain.steps.forEach((_, i) => {
      const a = sampleDistractors(chain.steps, i, mulberry32(42))
      const b = sampleDistractors(chain.steps, i, mulberry32(42))
      expect(a).toEqual(b)
    })
  })

  it('seed step falls back to its traps (no earlier siblings)', () => {
    const picked = sampleDistractors(chain.steps, 0, mulberry32(7))
    expect(picked.slice().sort()).toEqual(
      (chain.steps[0].trap_distractors_ru ?? []).slice().sort(),
    )
  })

  it('prefers earlier siblings when enough exist', () => {
    const last = chain.steps.length - 1
    const earlierRu = chain.steps.slice(0, last).map((s) => s.ru)
    const picked = sampleDistractors(chain.steps, last, mulberry32(7))
    for (const ru of picked) expect(earlierRu).toContain(ru)
  })

  it('step 2 uses its one earlier sibling, then its trap, then a later sibling', () => {
    const picked = sampleDistractors(chain.steps, 1, mulberry32(7))
    expect(picked).toContain(chain.steps[0].ru) // only earlier sibling
    expect(picked).toContain('Я хочу чаю') // its trap
    const laterRu = chain.steps.slice(2).map((s) => s.ru)
    expect(picked.some((ru) => laterRu.includes(ru))).toBe(true)
  })

  it('dedupes candidates that appear in several tiers', () => {
    const dupChain: Chain = {
      id: 'dup',
      title_ru: 'т',
      steps: [
        {
          id: 'dup.1', en: 'a', ru: 'РУ1', accepted_en: ['a'], new_part: 'a',
          trap_distractors_ru: ['X', 'X', 'Y'], audio: 'audio/dup.1.mp3',
        },
        {
          id: 'dup.2', en: 'a b', ru: 'РУ2', accepted_en: ['a b'], new_part: 'b',
          trap_distractors_ru: ['X', 'Z'], audio: 'audio/dup.2.mp3',
        },
        {
          id: 'dup.3', en: 'a b c', ru: 'РУ3', accepted_en: ['a b c'], new_part: 'c',
          audio: 'audio/dup.3.mp3',
        },
      ],
    }
    for (let seed = 1; seed <= 10; seed++) {
      // step 1 traps contain a literal duplicate ("X" twice)
      const seedPick = sampleDistractors(dupChain.steps, 0, mulberry32(seed))
      expect(new Set(seedPick).size).toBe(3)
      expect(seedPick).not.toContain('РУ1')
      // step 2's trap "X" duplicates step 1's trap pool
      const picked = sampleDistractors(dupChain.steps, 1, mulberry32(seed))
      expect(new Set(picked).size).toBe(3)
      expect(picked).not.toContain('РУ2')
    }
  })
})
