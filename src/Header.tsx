interface Props {
  user?: string | null
  onLogout?: () => void
}

export function Header({ user, onLogout }: Props) {
  return (
    <header className="site-header">
      <span className="site-logo">АнглоMonster</span>
      {user && (
        <span className="header-user">
          {user}
          <button className="subtle" onClick={onLogout}>
            Выйти
          </button>
        </span>
      )}
    </header>
  )
}
