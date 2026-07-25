import { useState, type FormEvent } from 'react'
import type { QuizItem } from '../types'
import { matchStrict } from '../lib/match'

interface Props {
  item: QuizItem
  onAttempt: (correct: boolean) => void
  done: boolean
}

export function Write({ item, onAttempt, done }: Props) {
  const [value, setValue] = useState('')
  const [missed, setMissed] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (done || !value.trim()) return
    const ok = matchStrict(value, item.accepted_en)
    if (!ok) setMissed(true)
    onAttempt(ok)
  }

  return (
    <form className="write" onSubmit={submit}>
      <p className="ru">{item.ru}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите по-английски"
        disabled={done}
        autoFocus
      />
      <button type="submit" className="primary" disabled={done || !value.trim()}>
        Проверить
      </button>
      {missed && !done && (
        <p className="feedback">
          Не совсем. Правильный ответ: <strong>{item.en}</strong> — введите
          его, чтобы продолжить.
        </p>
      )}
    </form>
  )
}
