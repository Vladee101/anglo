const IRREGULAR: Record<string, string> = {
  "won't": 'will not',
  "can't": 'cannot',
  "shan't": 'shall not',
  "let's": 'let us',
  "ain't": 'am not',
}

// Subjects whose 's can safely be expanded to "is" (possessive 's is left alone).
const S_IS_BASES = new Set([
  'he', 'she', 'it', 'that', 'there', 'here', 'what', 'who', 'where', 'how',
])

const SUFFIXES: Array<[RegExp, string]> = [
  [/n't$/, ' not'],
  [/'m$/, ' am'],
  [/'re$/, ' are'],
  [/'ve$/, ' have'],
  [/'ll$/, ' will'],
  [/'d$/, ' would'],
]

function expandContraction(token: string): string {
  const irregular = IRREGULAR[token]
  if (irregular) return irregular
  for (const [re, replacement] of SUFFIXES) {
    if (re.test(token)) {
      const base = token.replace(re, '')
      if (base) return base + replacement
    }
  }
  if (token.endsWith("'s")) {
    const base = token.slice(0, -2)
    if (S_IS_BASES.has(base)) return base + ' is'
  }
  return token
}

/**
 * Lowercase, trim, collapse whitespace, strip punctuation (apostrophes kept),
 * expand common contractions (I'd -> i would, don't -> do not, ...).
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'") // curly apostrophes -> straight
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ') // strip punctuation, keep apostrophes
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^'+|'+$/g, '')) // apostrophes used as quotes
    .filter(Boolean)
    .map(expandContraction)
    .join(' ')
}
