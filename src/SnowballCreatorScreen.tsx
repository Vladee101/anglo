import { useState, type FormEvent } from 'react'
import type { Chain, Step } from './types'
import { buildChallengeUrl } from './lib/urlParams'

interface DraftStep {
  en: string
  ru: string
  trap_ru: string
  reaction_ru: string
}

interface Props {
  author: string
  onSaveAndPlay: (chain: Chain) => void
  onClose: () => void
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

function computeNewPart(prevEn: string, currEn: string): string | null {
  const prevPool = [...words(prevEn)]
  const currWords = words(currEn)
  for (const w of prevPool) {
    const idx = currWords.indexOf(w)
    if (idx === -1) return null
    currWords.splice(idx, 1)
  }
  return currWords.length > 0 ? currWords.join(' ') : null
}

export function SnowballCreatorScreen({ author, onSaveAndPlay, onClose }: Props) {
  const [titleRu, setTitleRu] = useState('Снежный ком: Кофе в Нью-Йорке')
  const [reelHookRu, setReelHookRu] = useState(
    'Сможешь заказать кофе на английском и не спалиться? ☕️🗽',
  )
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([
    {
      en: 'I need coffee',
      ru: 'Мне нужен кофе',
      trap_ru: 'Я ненавижу кофе',
      reaction_ru: 'АнглоMonster: Без кофе утро не начнётся! Need — это нужен! ☕️',
    },
    {
      en: 'I need iced coffee',
      ru: 'Мне нужен холодный кофе со льдом',
      trap_ru: 'Мне нужен кофейный торт',
      reaction_ru: 'АнглоMonster: Iced — это со льдом, а не торт! 🧊',
    },
    {
      en: 'I really need iced coffee right now',
      ru: 'Мне очень нужен холодный кофе со льдом прямо сейчас',
      trap_ru: 'Мне нужен кофе через неделю',
      reaction_ru: 'АнглоMonster: Right now — прямо сейчас, пока глаза не закрылись! ⚡️',
    },
  ])
  const [error, setError] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)

  const updateStep = (idx: number, patch: Partial<DraftStep>) => {
    setError(null)
    setDraftSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const addStep = () => {
    const last = draftSteps[draftSteps.length - 1]
    setDraftSteps([
      ...draftSteps,
      {
        en: last ? `${last.en} please` : '',
        ru: last ? `${last.ru}, пожалуйста` : '',
        trap_ru: '',
        reaction_ru: '',
      },
    ])
  }

  const removeStep = (idx: number) => {
    if (draftSteps.length <= 2) return
    setDraftSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  const buildValidatedChain = (): Chain | null => {
    if (!titleRu.trim()) {
      setError('Укажите название вашего Снежного кома.')
      return null
    }
    if (draftSteps.length < 2) {
      setError('Снежный ком должен содержать минимум 2 шага.')
      return null
    }

    const id = `ugc-snowball-${Date.now().toString(36)}`
    const builtSteps: Step[] = []

    for (let i = 0; i < draftSteps.length; i++) {
      const d = draftSteps[i]
      if (!d.en.trim() || !d.ru.trim()) {
        setError(`Шаг ${i + 1}: заполните английскую фразу и русский перевод.`)
        return null
      }
      let newPart = d.en.trim()
      if (i > 0) {
        const diff = computeNewPart(draftSteps[i - 1].en, d.en)
        if (!diff) {
          setError(
            `Шаг ${i + 1} должен содержать все слова шага ${i} плюс новые слова («принцип снежного кома»).`,
          )
          return null
        }
        newPart = diff
      }

      const traps =
        i === 0
          ? [d.trap_ru.trim() || 'Неправильный вариант 1', 'Ловушка 2', 'Ловушка 3']
          : d.trap_ru.trim()
            ? [d.trap_ru.trim()]
            : ['Смешная ловушка']

      const reactions: Record<string, string> = {}
      if (d.trap_ru.trim() && d.reaction_ru.trim()) {
        reactions[d.trap_ru.trim()] = d.reaction_ru.trim()
      }

      builtSteps.push({
        id: `${id}.${i + 1}`,
        en: d.en.trim(),
        ru: d.ru.trim(),
        accepted_en: [d.en.trim()],
        new_part: newPart,
        trap_distractors_ru: traps,
        trap_reactions_ru: Object.keys(reactions).length > 0 ? reactions : undefined,
        audio: `audio/${id}.${i + 1}.mp3`,
      })
    }

    return {
      id,
      title_ru: titleRu.trim(),
      progressive: true,
      reel_hook_ru: reelHookRu.trim() || undefined,
      author,
      steps: builtSteps,
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const chain = buildValidatedChain()
    if (!chain) return
    onSaveAndPlay(chain)
  }

  const handleGenerateLink = () => {
    const chain = buildValidatedChain()
    if (!chain) return
    const url = buildChallengeUrl({
      unitId: chain.id,
      challenger: author,
      targetAttempts: chain.steps.length * 4,
      comment: chain.reel_hook_ru,
      sharedChain: chain,
    })
    setShareLink(url)
    navigator.clipboard?.writeText(url).catch(() => {})
  }

  return (
    <main className="app creator-screen">
      <button className="subtle" onClick={onClose}>
        ← Назад
      </button>

      <h1>⛄️ Создать свой «Снежный ком» (UGC)</h1>
      <p className="muted">
        Придумайте смешную цепочку, где каждый шаг добавляет 1–2 слова к предыдущему, и
        отправьте челлендж друзьям или запишите рилс!
      </p>

      <form className="creator-form" onSubmit={handleSubmit}>
        <label className="creator-field">
          <span>Название чейна</span>
          <input
            type="text"
            value={titleRu}
            onChange={(e) => setTitleRu(e.target.value)}
            placeholder="Например: Снежный ком: Заказ такси"
          />
        </label>

        <label className="creator-field">
          <span>Хук сверху для Reels / Shorts (9:16)</span>
          <input
            type="text"
            value={reelHookRu}
            onChange={(e) => setReelHookRu(e.target.value)}
            placeholder="Кликбейтный заголовок для видео"
          />
        </label>

        <div className="creator-steps">
          {draftSteps.map((step, i) => {
            const addedPreview =
              i === 0 ? step.en : computeNewPart(draftSteps[i - 1].en, step.en)
            return (
              <div key={i} className="creator-step-card">
                <div className="creator-step-header">
                  <strong>
                    Шаг {i + 1}{' '}
                    {addedPreview ? (
                      <span className="snowball-new-part">+{addedPreview}</span>
                    ) : (
                      <span className="feedback">⚠️ нарушен принцип кома</span>
                    )}
                  </strong>
                  {draftSteps.length > 2 && (
                    <button
                      type="button"
                      className="subtle"
                      onClick={() => removeStep(i)}
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={step.en}
                  onChange={(e) => updateStep(i, { en: e.target.value })}
                  placeholder="Фраза по-английски (должна включать предыдущий шаг)"
                />
                <input
                  type="text"
                  value={step.ru}
                  onChange={(e) => updateStep(i, { ru: e.target.value })}
                  placeholder="Перевод по-русски"
                />
                <input
                  type="text"
                  value={step.trap_ru}
                  onChange={(e) => updateStep(i, { trap_ru: e.target.value })}
                  placeholder="Смешная ловушка (неправильный перевод для рилса)"
                />
                <input
                  type="text"
                  value={step.reaction_ru}
                  onChange={(e) => updateStep(i, { reaction_ru: e.target.value })}
                  placeholder="Панчлайн АнглоMonster при выборе ловушки"
                />
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addStep}>
          + Добавить следующий шаг кома
        </button>

        {error && <p className="notice">{error}</p>}

        {shareLink && (
          <div className="share-box">
            <p className="muted">
              ✓ Прямая ссылка на ваш авторский «Снежный ком» скопирована:
            </p>
            <input type="text" readOnly value={shareLink} />
          </div>
        )}

        <div className="creator-actions">
          <button type="submit" className="primary">
            🚀 Сохранить и пройти самому
          </button>
          <button type="button" onClick={handleGenerateLink}>
            🔗 Сгенерировать ссылку для Reels / Друзей
          </button>
        </div>
      </form>
    </main>
  )
}
