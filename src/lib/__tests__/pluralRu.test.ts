import { describe, expect, it } from 'vitest'
import { pluralizeRu } from '../pluralRu'

const WORD = ['слово', 'слова', 'слов'] as const

describe('pluralizeRu', () => {
  it('uses the "one" form for numbers ending in 1 (except 11)', () => {
    expect(pluralizeRu(1, WORD)).toBe('слово')
    expect(pluralizeRu(21, WORD)).toBe('слово')
    expect(pluralizeRu(101, WORD)).toBe('слово')
  })

  it('uses the "few" form for 2-4 (except 12-14)', () => {
    expect(pluralizeRu(2, WORD)).toBe('слова')
    expect(pluralizeRu(3, WORD)).toBe('слова')
    expect(pluralizeRu(4, WORD)).toBe('слова')
    expect(pluralizeRu(22, WORD)).toBe('слова')
  })

  it('uses the "many" form for 0, 5-20, and teens', () => {
    expect(pluralizeRu(0, WORD)).toBe('слов')
    expect(pluralizeRu(5, WORD)).toBe('слов')
    expect(pluralizeRu(9, WORD)).toBe('слов')
    expect(pluralizeRu(11, WORD)).toBe('слов')
    expect(pluralizeRu(12, WORD)).toBe('слов')
    expect(pluralizeRu(14, WORD)).toBe('слов')
    expect(pluralizeRu(20, WORD)).toBe('слов')
  })

  it('handles the 11-14 exception at higher magnitudes', () => {
    expect(pluralizeRu(111, WORD)).toBe('слов')
    expect(pluralizeRu(112, WORD)).toBe('слов')
  })
})
