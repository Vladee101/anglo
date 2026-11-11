interface Props {
  user?: string | null
  onLogout?: () => void
  onOpenLogin?: () => void
  studioMode?: boolean
  onToggleStudio?: () => void
}

export function Header({
  user,
  onLogout,
  onOpenLogin,
  studioMode,
  onToggleStudio,
}: Props) {
  return (
    <header className="site-header">
      <span className="site-logo">👾 АнглоMonster</span>
      <div className="header-actions">
        {onToggleStudio && (
          <button
            type="button"
            className={'studio-toggle' + (studioMode ? ' active' : '')}
            onClick={onToggleStudio}
            title="Переключить вертикальный режим 9:16 для записи Reels / Shorts"
          >
            🎬 {studioMode ? 'Студия 9:16 ВКЛ' : 'Рилс 9:16'}
          </button>
        )}
        {user ? (
          <span className="header-user">
            @{user}
            {onLogout && (
              <button className="subtle" onClick={onLogout}>
                Выйти
              </button>
            )}
          </span>
        ) : (
          onOpenLogin && (
            <button className="subtle" onClick={onOpenLogin}>
              Войти
            </button>
          )
        )}
      </div>
    </header>
  )
}
