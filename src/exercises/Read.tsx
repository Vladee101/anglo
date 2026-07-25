import type { QuizItem } from '../types'
import { OptionQuiz } from './OptionQuiz'

interface Props {
  item: QuizItem
  pool: readonly QuizItem[]
  index: number
  onAttempt: (correct: boolean) => void
  done: boolean
}

export function Read({ item, pool, index, onAttempt, done }: Props) {
  return (
    <OptionQuiz
      item={item}
      pool={pool}
      index={index}
      onAttempt={onAttempt}
      done={done}
      prompt={<p className="en">{item.en}</p>}
    />
  )
}
