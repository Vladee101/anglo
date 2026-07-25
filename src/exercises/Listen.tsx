import { useState } from 'react'
import type { QuizItem } from '../types'
import { OptionQuiz } from './OptionQuiz'

interface Props {
  item: QuizItem
  pool: readonly QuizItem[]
  index: number
  onAttempt: (correct: boolean) => void
  done: boolean
}

export function Listen({ item, pool, index, onAttempt, done }: Props) {
  const [audioFailed, setAudioFailed] = useState(false)

  const prompt =
    audioFailed || !item.audio ? (
      <div>
        <p className="notice">аудио отсутствует — показан текст вместо него</p>
        <p className="en">{item.en}</p>
      </div>
    ) : (
      <audio
        controls
        src={`${import.meta.env.BASE_URL}${item.audio}`}
        onError={() => setAudioFailed(true)}
      />
    )

  return (
    <OptionQuiz
      item={item}
      pool={pool}
      index={index}
      onAttempt={onAttempt}
      done={done}
      prompt={prompt}
    />
  )
}
