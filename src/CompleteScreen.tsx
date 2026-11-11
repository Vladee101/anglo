import { useState } from 'react'
import {
  isSkipped,
  type Chain,
  type ChallengeContext,
  type Playlist,
  type SnowballPost,
  type StepProgress,
} from './types'
import { pluralizeRu } from './lib/pluralRu'
import {
  computeSnowballStats,
  likeSnowballPost,
  loadSnowballFeed,
  publishSnowballPost,
} from './lib/ugcFeed'
import { downloadSnowballCard } from './lib/shareCard'
import { buildChallengeUrl } from './lib/urlParams'

interface Props {
  playlist: Playlist
  progress: StepProgress[]
  onBackToTitle: () => void
  user?: string
  challenge?: ChallengeContext | null
  sharedChain?: Chain | null
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export function CompleteScreen({
  playlist,
  progress,
  onBackToTitle,
  user = 'Guest',
  challenge = null,
  sharedChain = null,
}: Props) {
  const isMixed = playlist.modalities.length > 1
  const showGrowth = isMixed && playlist.progressive !== false
  const showSpeakColumn = playlist.modalities.includes('speak')
  const first = playlist.items[0]
  const last = playlist.items[playlist.items.length - 1]

  let totalAttempts = 0
  const perItem = playlist.items.map((item) => {
    const p = progress.find((sp) => sp.step_id === item.id)
    let attempts = 0
    for (const m of playlist.modalities) {
      const r = p?.results[m]
      if (r && !isSkipped(r)) attempts += r.attempts
    }
    totalAttempts += attempts
    const speak = p?.results.speak
    const speakSkipped = speak !== undefined && isSkipped(speak)
    return { item, attempts, speakSkipped }
  })

  const stats = computeSnowballStats(playlist, progress)
  const [comment, setComment] = useState('')
  const [published, setPublished] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [cardDownloaded, setCardDownloaded] = useState(false)
  const [feed, setFeed] = useState<SnowballPost[]>(() => loadSnowballFeed(playlist.id))

  const handlePublish = () => {
    if (published) return
    const created = publishSnowballPost({
      unitId: playlist.id,
      unitTitle: playlist.title_ru,
      username: user,
      totalAttempts: totalAttempts || stats.totalAttempts,
      idealAttempts: stats.idealAttempts,
      accuracyPct: stats.accuracyPct,
      rank: stats.rank,
      firstEn: first.en,
      lastEn: last.en,
      wordGrowth: [wordCount(first.en), wordCount(last.en)],
      comment:
        comment.trim() ||
        `Собрал снежный ком от «${first.en}» до «${last.en}»! Попробуй обогнать 🔥`,
    })
    setFeed((prev) => [created, ...prev])
    setPublished(true)
  }

  const handleCopyChallenge = () => {
    const url = buildChallengeUrl({
      unitId: playlist.id,
      challenger: user,
      targetAttempts: totalAttempts || stats.totalAttempts,
      comment: comment.trim() || undefined,
      sharedChain: sharedChain ?? undefined,
    })
    setCopiedLink(url)
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  const handleDownloadCard = () => {
    const ok = downloadSnowballCard({
      username: user,
      playlist,
      totalAttempts: totalAttempts || stats.totalAttempts,
      accuracyPct: stats.accuracyPct,
      rank: stats.rank,
      comment,
    })
    if (ok) setCardDownloaded(true)
  }

  const handleLike = (id: string) => {
    likeSnowballPost(id)
    setFeed((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)))
  }

  const beatChallenge =
    challenge !== null &&
    (totalAttempts || stats.totalAttempts) <= challenge.targetAttempts

  return (
    <main className="app complete-screen">
      <h1>Готово! 🎉</h1>

      {challenge && (
        <div className={'challenge-banner' + (beatChallenge ? ' win' : '')}>
          <strong>
            {beatChallenge
              ? `🏆 Вы побили рекорд @${challenge.challenger} (${challenge.targetAttempts} поп.)!`
              : `⚔️ Вызов от @${challenge.challenger}: его рекорд — ${challenge.targetAttempts} поп.`}
          </strong>
        </div>
      )}

      {showGrowth && (
        <>
          <div className="growth">
            <div className="growth-card">
              <p className="muted">Начали с:</p>
              <p className="en">{first.en}</p>
            </div>
            <span className="growth-arrow">→</span>
            <div className="growth-card">
              <p className="muted">Стало:</p>
              <p className="en">{last.en}</p>
            </div>
          </div>
          <p className="growth-line">
            Было {wordCount(first.en)}{' '}
            {pluralizeRu(wordCount(first.en), ['слово', 'слова', 'слов'])} — стало{' '}
            {wordCount(last.en)} {pluralizeRu(wordCount(last.en), ['слово', 'слова', 'слов'])}.
          </p>
        </>
      )}

      <p className="totals">
        Всего попыток: <strong>{totalAttempts}</strong> · Ранг:{' '}
        <strong className="rank-badge">{stats.rank}</strong> ({stats.accuracyPct}% точность)
      </p>

      <table className="summary">
        <thead>
          <tr>
            <th>Шаг</th>
            <th>Попытки</th>
            {showSpeakColumn && <th>Speak</th>}
          </tr>
        </thead>
        <tbody>
          {perItem.map(({ item, attempts, speakSkipped }) => (
            <tr key={item.id}>
              <td>{item.en}</td>
              <td>{attempts}</td>
              {showSpeakColumn && (
                <td className="speak-status" title={speakSkipped ? 'Пропущено' : 'Выполнено'}>
                  {speakSkipped ? '—' : '✓'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showGrowth && (
        <section className="ugc-publish-box">
          <h2>🔥 Опубликовать результат «Снежного кома»</h2>
          <p className="muted">
            Поделитесь прохождением в ленте комьюнити, скачайте вертикальную карточку 9:16
            для Reels / Stories или бросьте вызов друзьям!
          </p>
          <input
            type="text"
            className="ugc-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ваш комментарий или шутка к прохождению (необязательно)"
            disabled={published}
          />
          <div className="ugc-actions">
            <button
              type="button"
              className="primary"
              onClick={handlePublish}
              disabled={published}
            >
              {published ? '✓ Опубликовано в ленте' : '🏆 Опубликовать в ленту'}
            </button>
            <button type="button" onClick={handleDownloadCard}>
              📲 {cardDownloaded ? 'Карточка 9:16 скачана!' : 'Скачать 9:16 PNG для Reels'}
            </button>
            <button type="button" onClick={handleCopyChallenge}>
              🔗 Бросить вызов (ссылка)
            </button>
          </div>
          {copiedLink && (
            <div className="share-box">
              <p className="muted">Челлендж-ссылка скопирована в буфер обмена:</p>
              <input type="text" readOnly value={copiedLink} />
            </div>
          )}

          {feed.length > 0 && (
            <div className="ugc-feed">
              <h3>Лента прохождений этого кома ({feed.length})</h3>
              <ul className="ugc-feed-list">
                {feed.map((post) => (
                  <li key={post.id} className="ugc-feed-card">
                    <div className="ugc-feed-top">
                      <strong>@{post.username}</strong>
                      <span className="rank-pill">Ранг {post.rank}</span>
                      <span className="muted">
                        {post.totalAttempts} поп. · {post.accuracyPct}%
                      </span>
                    </div>
                    <p className="ugc-feed-growth">
                      «{post.firstEn}» → «{post.lastEn}» ({post.wordGrowth[0]} →{' '}
                      {post.wordGrowth[1]} сл.)
                    </p>
                    <p className="ugc-feed-comment">{post.comment}</p>
                    <button
                      type="button"
                      className="like-btn"
                      onClick={() => handleLike(post.id)}
                    >
                      ❤️ {post.likes}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <button className="primary" onClick={onBackToTitle}>
        На главный экран
      </button>
    </main>
  )
}
