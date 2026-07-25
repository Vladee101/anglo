import { describe, expect, it } from 'vitest'
import { findResume, withResult } from '../playlist'
import type { Playlist, StepProgress } from '../../types'

const mixedPlaylist: Playlist = {
  id: 'want-water',
  title_ru: 'т',
  items: [
    { id: 'want-water.1', en: 'I want', ru: 'Я хочу', accepted_en: ['I want'] },
    { id: 'want-water.2', en: 'I want water', ru: 'Я хочу воды', accepted_en: ['I want water'] },
  ],
  modalities: ['read', 'listen', 'write', 'speak'],
}

const drillPlaylist: Playlist = {
  id: 'read-basics',
  title_ru: 'т',
  items: [
    { id: 'read-basics.1', en: 'Hello', ru: 'Привет', accepted_en: ['Hello'] },
    { id: 'read-basics.2', en: 'Thank you', ru: 'Спасибо', accepted_en: ['Thank you'] },
  ],
  modalities: ['read'],
}

describe('findResume', () => {
  it('resumes at the first item/modality with no progress', () => {
    expect(findResume(mixedPlaylist, [])).toEqual({ itemIndex: 0, modIndex: 0 })
  })

  it('advances within an item across modalities', () => {
    const progress: StepProgress[] = [
      { step_id: 'want-water.1', results: { read: { correct: true, attempts: 1, ms: 10 } } },
    ]
    expect(findResume(mixedPlaylist, progress)).toEqual({ itemIndex: 0, modIndex: 1 })
  })

  it('advances to the next item once all modalities are done', () => {
    const allRead: StepProgress[] = [
      {
        step_id: 'want-water.1',
        results: {
          read: { correct: true, attempts: 1, ms: 10 },
          listen: { correct: true, attempts: 1, ms: 10 },
          write: { correct: true, attempts: 1, ms: 10 },
          speak: { correct: true, attempts: 1, ms: 10 },
        },
      },
    ]
    expect(findResume(mixedPlaylist, allRead)).toEqual({ itemIndex: 1, modIndex: 0 })
  })

  it('treats a skipped modality as done', () => {
    const progress: StepProgress[] = [
      { step_id: 'want-water.1', results: { speak: { skipped: true, reason: 'unsupported' } } },
    ]
    expect(findResume(mixedPlaylist, progress)).toEqual({ itemIndex: 0, modIndex: 0 })
  })

  it('returns null once every item/modality is done', () => {
    const done: StepProgress[] = mixedPlaylist.items.map((item) => ({
      step_id: item.id,
      results: {
        read: { correct: true, attempts: 1, ms: 10 },
        listen: { correct: true, attempts: 1, ms: 10 },
        write: { correct: true, attempts: 1, ms: 10 },
        speak: { correct: true, attempts: 1, ms: 10 },
      },
    }))
    expect(findResume(mixedPlaylist, done)).toBeNull()
  })

  it('single-modality drill playlists only check that one modality', () => {
    const progress: StepProgress[] = [
      { step_id: 'read-basics.1', results: { read: { correct: true, attempts: 1, ms: 10 } } },
    ]
    expect(findResume(drillPlaylist, progress)).toEqual({ itemIndex: 1, modIndex: 0 })
  })
})

describe('withResult', () => {
  it('creates a new progress entry for an unseen item', () => {
    const result = withResult([], 'read-basics.1', 'read', { correct: true, attempts: 1, ms: 5 })
    expect(result).toEqual([
      { step_id: 'read-basics.1', results: { read: { correct: true, attempts: 1, ms: 5 } } },
    ])
  })

  it('merges into an existing item without touching other modalities', () => {
    const existing: StepProgress[] = [
      { step_id: 'want-water.1', results: { read: { correct: true, attempts: 1, ms: 5 } } },
    ]
    const result = withResult(existing, 'want-water.1', 'listen', {
      correct: true,
      attempts: 2,
      ms: 8,
    })
    expect(result).toEqual([
      {
        step_id: 'want-water.1',
        results: {
          read: { correct: true, attempts: 1, ms: 5 },
          listen: { correct: true, attempts: 2, ms: 8 },
        },
      },
    ])
  })
})
