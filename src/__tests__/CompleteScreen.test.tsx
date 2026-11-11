// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CompleteScreen } from '../CompleteScreen'
import type { Playlist } from '../types'

afterEach(cleanup)

const basePlaylist: Playlist = {
  id: 'test',
  title_ru: 'т',
  items: [
    { id: 'test.1', en: 'Hello', ru: 'Привет', accepted_en: ['Hello'] },
    { id: 'test.2', en: 'Hello world', ru: 'Привет мир', accepted_en: ['Hello world'] },
  ],
  modalities: ['read', 'listen', 'write', 'speak'],
}

describe('CompleteScreen growth summary & UGC publishing', () => {
  it('shows growth and UGC publish section for a progressive mixed playlist', () => {
    render(
      <CompleteScreen
        playlist={{ ...basePlaylist, progressive: true }}
        progress={[]}
        onBackToTitle={() => {}}
      />,
    )
    expect(screen.queryByText('Начали с:')).not.toBeNull()
    expect(screen.queryByText(/Опубликовать результат «Снежного кома»/)).not.toBeNull()
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

  it('publishes a user result to the community feed on click', () => {
    render(
      <CompleteScreen
        playlist={{ ...basePlaylist, progressive: true }}
        progress={[]}
        onBackToTitle={() => {}}
        user="Vlad"
      />,
    )
    const btn = screen.getByRole('button', { name: /Опубликовать в ленту/i })
    fireEvent.click(btn)
    expect(screen.queryByText(/Опубликовано в ленте/i)).not.toBeNull()
  })
})
