import { useState, type FormEvent } from 'react'
import { checkCredentials } from './lib/auth'

interface Props {
  onLogin: (username: string) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (checkCredentials(username, password)) {
      onLogin(username)
    } else {
      setError(true)
    }
  }

  return (
    <main className="app login-screen">
      <h1>Вход</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Логин"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setError(false)
          }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
        />
        <button className="primary" type="submit">
          Войти
        </button>
        {error && <p className="notice">Неверный логин или пароль</p>}
      </form>
    </main>
  )
}
