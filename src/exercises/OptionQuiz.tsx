import { useMemo, useState, type ReactNode } from 'react'
import type { QuizItem } from '../types'
import { sampleDistractors } from '../lib/distractors'
import { shuffle } from '../lib/rng'

interface Props {
  item: QuizItem
  pool: readonly QuizItem[]
  index: number
  prompt: ReactNode
  onAttempt: (correct: boolean) => void
  done: boolean
}

/** Shared 4-option RU multiple choice used by Read and Listen. */
export function OptionQuiz({ item, pool, index, prompt, onAttempt, done }: Props) {
  const options = useMemo(
    () =>
      shuffle(
        [item.ru, ...sampleDistractors(pool, index, Math.random)],
        Math.random,
      ),
    [pool, index, item.ru],
  )
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  const [lastWrongPick, setLastWrongPick] = useState<string | null>(null)

  const pick = (ru: string) => {
    if (done) return
    if (ru !== item.ru) {
      setWrongPicks((w) => (w.includes(ru) ? w : [...w, ru]))
      setLastWrongPick(ru)
    }
    onAttempt(ru === item.ru)
  }

  const monsterReaction =
    lastWrongPick && item.trap_reactions_ru?.[lastWrongPick]
      ? item.trap_reactions_ru[lastWrongPick]
      : null

  return (
    <div className="option-quiz">
      <div className="prompt">{prompt}</div>
      <div className="options">
        {options.map((ru) => (
          <button
            key={ru}
            className={
              'option' +
              (wrongPicks.includes(ru) ? ' wrong' : '') +
              (done && ru === item.ru ? ' right' : '')
            }
            onClick={() => pick(ru)}
            disabled={done}
          >
            {ru}
          </button>
        ))}
      </div>
      {monsterReaction && !done && (
        <div className="monster-bubble" role="status">
          <span className="monster-avatar">👾</span>
          <p>{monsterReaction}</p>
        </div>
      )}
      {wrongPicks.length > 0 && !done && (
        <p className="feedback">
          Правильный ответ: <strong>{item.ru}</strong> — выберите его, чтобы продолжить.
        </p>
      )}
    </div>
  )
}
