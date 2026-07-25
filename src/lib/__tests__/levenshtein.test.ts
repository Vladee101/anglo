import { describe, expect, it } from 'vitest'
import { levenshtein } from '../levenshtein'

describe('levenshtein', () => {
  it('is 0 for equal strings', () => {
    expect(levenshtein('water', 'water')).toBe(0)
    expect(levenshtein('', '')).toBe(0)
  })

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })

  it('counts substitutions, insertions and deletions', () => {
    expect(levenshtein('water', 'wader')).toBe(1) // substitution
    expect(levenshtein('water', 'waters')).toBe(1) // insertion
    expect(levenshtein('water', 'wter')).toBe(1) // deletion
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('is symmetric', () => {
    expect(levenshtein('drink', 'drank')).toBe(levenshtein('drank', 'drink'))
  })
})
