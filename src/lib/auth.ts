import users from '../../users.json'

interface User {
  username: string
  password: string
}

const USERS = users as User[]
const AUTH_KEY = 'esl-auth-user'

export function checkCredentials(username: string, password: string): boolean {
  return USERS.some((u) => u.username === username && u.password === password)
}

export function loadAuthUser(): string | null {
  return localStorage.getItem(AUTH_KEY)
}

export function saveAuthUser(username: string): void {
  localStorage.setItem(AUTH_KEY, username)
}

export function clearAuthUser(): void {
  localStorage.removeItem(AUTH_KEY)
}
