// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { DictionaryScreen } from '../DictionaryScreen'
import type { Dictionary, ManifestEntry } from '../types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DictionaryScreen', () => {
  it('shows a notice when no dictionary lessons exist', () => {
    render(<DictionaryScreen bucket={[]} onClose={() => {}} />)
    expect(screen.queryByText('Материалы словаря пока не добавлены.')).not.toBeNull()
  })

  it('lists lessons to choose from when there is more than one', () => {
    const bucket: ManifestEntry[] = [
      { id: 'verbs', title_ru: 'Словарь: глаголы', file: 'dictionary/verbs.json' },
      { id: 'nouns', title_ru: 'Словарь: существительные', file: 'dictionary/nouns.json' },
    ]
    render(<DictionaryScreen bucket={bucket} onClose={() => {}} />)
    expect(screen.queryByText('Словарь: глаголы')).not.toBeNull()
    expect(screen.queryByText('Словарь: существительные')).not.toBeNull()
  })

  it('fetches and renders entries for a single-lesson bucket', async () => {
    const dict: Dictionary = {
      id: 'verbs',
      title_ru: 'Словарь: глаголы',
      entries: [
        {
          id: 'verbs.1',
          en: 'be',
          meaning_ru: 'быть',
          example_en: 'She is a teacher.',
          example_ru: 'Она учительница.',
          mistakes_ru: 'Не пропускайте связку "be".',
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => dict }),
    )
    const bucket: ManifestEntry[] = [{ id: 'verbs', title_ru: 'Словарь: глаголы', file: 'dictionary/verbs.json' }]
    render(<DictionaryScreen bucket={bucket} onClose={() => {}} />)

    await waitFor(() => expect(screen.queryByText('be')).not.toBeNull())
    expect(screen.queryByText('быть')).not.toBeNull()
    expect(screen.queryByText(/Не пропускайте связку/)).not.toBeNull()
  })
})
