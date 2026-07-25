/**
 * Standard Russian count-word agreement: pick the form matching n.
 * forms = [one, few, many], e.g. ['слово', 'слова', 'слов'] for 1, 2, 5.
 */
export function pluralizeRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}
