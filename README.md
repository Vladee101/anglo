# Anglo

## Content pipeline: audio generation

Step audio (`audio/{step.id}.mp3`, served from `public/audio/`) is generated
by [`scripts/generate-audio.py`](scripts/generate-audio.py) via Microsoft Edge
TTS. This is a **dev-only content tool** — it is not part of the app build,
the app has no Python dependency, and it only ever runs manually, by a
content author, after editing `chains/*.json`. The generated `.mp3` files and
`public/audio/manifest.json` are ordinary content assets and are committed to
git alongside the chain JSON.

### Setup

```sh
pip install edge-tts
```

### Usage

```sh
npm run audio                       # generate what changed, skip the rest
python scripts/generate-audio.py --force   # regenerate every step's audio
python scripts/generate-audio.py --prune   # also delete orphaned mp3s/manifest entries
```

A step's audio is regenerated when its mp3 is missing, or when
`manifest.json`'s recorded `(en, voice, rate)` for that step no longer
matches the chain's current `en` text or the script's `VOICE`/`RATE`
constants; otherwise it's skipped. Run `npm run validate:assets` afterward to
confirm every step has a matching audio file and there are no orphans.

### Validation

- `npm run validate` — content contract only (C1–C8); never touches the
  filesystem beyond `chains/`, so it works with no audio present.
- `npm run validate:assets` — adds C9 (audio file exists) and C10 (no orphan
  mp3s in `public/audio/`); requires audio to have been generated first.
