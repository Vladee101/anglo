import { normalize } from './normalize'
import { levenshtein } from './levenshtein'

const ARTICLES = new Set(['a', 'an', 'the'])

const stripArticles = (normalized: string): string =>
  normalized
    .split(' ')
    .filter((w) => !ARTICLES.has(w))
    .join(' ')

/** Typed-answer matcher: exact after normalization, tolerating one typo. */
export function matchStrict(input: string, accepted: string[]): boolean {
  const n = normalize(input)
  return accepted.some((a) => levenshtein(n, normalize(a)) <= 1)
}

/**
 * Spoken-answer matcher: ignores article differences, tolerates two edits.
 * On the seed step a transcript that merely starts with an accepted answer
 * also passes (learners tend to keep talking).
 */
export function matchLoose(
  transcript: string,
  accepted: string[],
  isSeedStep: boolean,
): boolean {
  const t = stripArticles(normalize(transcript))
  return accepted.some((raw) => {
    const a = stripArticles(normalize(raw))
    if (levenshtein(t, a) <= 2) return true
    if (isSeedStep && (t === a || t.startsWith(a + ' '))) return true
    return false
  })
}
