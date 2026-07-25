import { describe, expect, it } from 'vitest'
import { matchStrict, matchLoose } from '../match'

describe('matchStrict', () => {
  const accepted = ['I want water', 'I want some water']

  it('passes an exact answer regardless of case and punctuation', () => {
    expect(matchStrict('i want water', accepted)).toBe(true)
    expect(matchStrict('  I want water!  ', accepted)).toBe(true)
  })

  it('tolerates a single typo', () => {
    expect(matchStrict('i wnt water', accepted)).toBe(true) // 1 deletion
  })

  it('rejects two typos', () => {
    expect(matchStrict('i wnt watr', accepted)).toBe(false)
  })

  it('rejects unrelated input', () => {
    expect(matchStrict('tea please', accepted)).toBe(false)
  })

  it('matches through contractions on either side', () => {
    expect(matchStrict("I don't want water", ['I do not want water'])).toBe(true)
    expect(matchStrict("I'd like water", ['I would like water'])).toBe(true)
  })

  it('matches any accepted variant', () => {
    expect(matchStrict('I want some water', accepted)).toBe(true)
  })
})

describe('matchLoose', () => {
  it('ignores an added article', () => {
    expect(matchLoose('I want the water', ['I want water'], false)).toBe(true)
  })

  it('ignores a dropped article', () => {
    expect(
      matchLoose('I want to drink water', ['I want to drink the water'], false),
    ).toBe(true)
  })

  it('tolerates up to two edits', () => {
    expect(
      matchLoose('i want to drnk cold watr', ['I want to drink cold water'], false),
    ).toBe(true)
  })

  it('rejects unrelated speech', () => {
    expect(matchLoose('hello there my friend', ['I want water'], false)).toBe(false)
  })

  it('seed step: passes when the transcript starts with an accepted answer', () => {
    expect(matchLoose('I want to drink some water', ['I want'], true)).toBe(true)
  })

  it('non-seed step: the starts-with rule does not apply', () => {
    expect(matchLoose('I want to drink some water', ['I want'], false)).toBe(false)
  })

  it('starts-with respects word boundaries', () => {
    // "i wanteering" neither starts with "i want " nor is within 2 edits
    expect(matchLoose('I wanteering', ['I want'], true)).toBe(false)
  })
})
