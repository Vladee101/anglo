// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CompleteScreen } from '../CompleteScreen'
import type { Playlist } from '../types'

afterEach(cleanup)

const basePlaylist: Playlist = {
  id: 'test',
  title_ru: 'т',
  items: [
    { id: 'test.1', en: 'Hello', ru: 'Привет', accepted_en: ['Hello'] },
    { id: 'test.2', en: 'Bye', ru: 'Пока', accepted_en: ['Bye'] },
  ],
  modalities: ['read', 'listen', 'write', 'speak'],
}

describe('CompleteScreen growth summary', () => {
  it('shows growth for a progressive mixed playlist', () => {
    render(
      <CompleteScreen
        playlist={{ ...basePlaylist, progressive: true }}
        progress={[]}
        onBackToTitle={() => {}}
      />,
    )
    expect(screen.queryByText('Начали с:')).not.toBeNull()
  })

  it('shows growth when progressive is omitted (defaults to true)', () => {
    render(<CompleteScreen playlist={basePlaylist} progress={[]} onBackToTitle={() => {}} />)
    expect(screen.queryByText('Начали с:')).not.toBeNull()
  })

  it('hides growth for a non-progressive mixed playlist', () => {
    render(
      <CompleteScreen
        playlist={{ ...basePlaylist, progressive: false }}
        progress={[]}
        onBackToTitle={() => {}}
      />,
    )
    expect(screen.queryByText('Начали с:')).toBeNull()
  })

  it('hides growth for a single-modality (drill) playlist', () => {
    render(
      <CompleteScreen
        playlist={{ ...basePlaylist, modalities: ['read'] }}
        progress={[]}
        onBackToTitle={() => {}}
      />,
    )
    expect(screen.queryByText('Начали с:')).toBeNull()
  })
})
