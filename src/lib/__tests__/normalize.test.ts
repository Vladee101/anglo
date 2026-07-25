import { describe, expect, it } from 'vitest'
import { normalize } from '../normalize'

describe('normalize', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalize('  I   Want\tWater ')).toBe('i want water')
  })

  it('strips punctuation but keeps apostrophes inside words', () => {
    expect(normalize('Hello, world!!!')).toBe('hello world')
    expect(normalize("the cat's bowl")).toBe("the cat's bowl")
  })

  it('drops apostrophes used as quotes around words', () => {
    expect(normalize("'water'")).toBe('water')
  })

  it('expands common contractions', () => {
    expect(normalize("I'd")).toBe('i would')
    expect(normalize("I'm")).toBe('i am')
    expect(normalize("don't")).toBe('do not')
    expect(normalize("doesn't")).toBe('does not')
    expect(normalize("can't")).toBe('cannot')
    expect(normalize("won't")).toBe('will not')
    expect(normalize("it's cold")).toBe('it is cold')
    expect(normalize("we'll drink")).toBe('we will drink')
    expect(normalize("you've")).toBe('you have')
    expect(normalize("they're")).toBe('they are')
  })

  it('handles curly apostrophes', () => {
    expect(normalize('I’m')).toBe('i am')
  })

  it('leaves possessive ’s alone', () => {
    expect(normalize("John's water")).toBe("john's water")
  })
})
