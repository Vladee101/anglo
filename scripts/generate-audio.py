#!/usr/bin/env python3
"""Generate step audio for ESL quiz chains and drills via Microsoft Edge TTS.

This is a content-pipeline dev tool, NOT part of the app build (the app has
no Python dependency; it only ever fetches the resulting static mp3s). Run it
manually after editing chains/*.json or drills/*.json (drill items without an
`audio` field are skipped — audio is optional there, only meaningful for
listen drills). The generated .mp3 files and public/audio/manifest.json are
ordinary content assets and are committed to git, same as the JSON itself.

Setup:
    pip install edge-tts        # or: pipx install edge-tts

Usage:
    python scripts/generate-audio.py            # generate what changed, skip the rest
    python scripts/generate-audio.py --force     # regenerate every step's audio
    python scripts/generate-audio.py --prune     # also delete orphaned mp3s/manifest entries

A step's audio is (re)synthesized when its target mp3 file is missing, or
when public/audio/manifest.json's recorded (en, voice, rate) for that step
no longer matches the chain's current `en` text or the VOICE/RATE constants
below; otherwise it is skipped. The manifest is updated after each successful
synthesis so an interrupted run loses no completed work.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Force UTF-8 stdio so the status symbols below don't crash on Windows
# consoles running a legacy code page (cp1252 etc).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

VOICE = "en-US-JennyNeural"
RATE = "-10%"  # slightly slowed for A1 learners

ROOT = Path(__file__).resolve().parent.parent
CHAINS_DIR = ROOT / "chains"
DRILLS_DIR = ROOT / "drills"
PUBLIC_DIR = ROOT / "public"
AUDIO_DIR = PUBLIC_DIR / "audio"
MANIFEST_PATH = AUDIO_DIR / "manifest.json"


def load_steps() -> dict[str, dict]:
    """item id -> {"en", "audio" (repo-relative path), "path" (filesystem path)}."""
    steps: dict[str, dict] = {}
    for chain_file in sorted(CHAINS_DIR.glob("*.json")):
        chain = json.loads(chain_file.read_text(encoding="utf-8"))
        for step in chain.get("steps", []):
            steps[step["id"]] = {
                "en": step["en"],
                "audio": step["audio"],
                "path": PUBLIC_DIR / step["audio"],
            }
    for drill_file in sorted(DRILLS_DIR.glob("*.json")) if DRILLS_DIR.exists() else []:
        drill = json.loads(drill_file.read_text(encoding="utf-8"))
        for item in drill.get("items", []):
            audio = item.get("audio")
            if not audio:
                continue  # audio is optional for drill items (only listen drills use it)
            steps[item["id"]] = {
                "en": item["en"],
                "audio": audio,
                "path": PUBLIC_DIR / audio,
            }
    return steps


def load_manifest() -> dict[str, dict]:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: dict[str, dict]) -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def needs_generation(en: str, path: Path, entry: dict | None, force: bool) -> bool:
    if force or not path.exists() or entry is None:
        return True
    return entry.get("en") != en or entry.get("voice") != VOICE or entry.get("rate") != RATE


async def synthesize(en: str, dest: Path) -> None:
    import edge_tts  # imported lazily so --help works without the dependency installed

    dest.parent.mkdir(parents=True, exist_ok=True)
    await edge_tts.Communicate(en, voice=VOICE, rate=RATE).save(str(dest))


async def run(force: bool, prune: bool) -> int:
    steps = load_steps()
    manifest = load_manifest()

    generated = 0
    skipped = 0
    failed = 0

    for step_id, info in steps.items():
        en, path = info["en"], info["path"]
        if not needs_generation(en, path, manifest.get(step_id), force):
            print(f"· skipped {info['audio']} (up to date)")
            skipped += 1
            continue
        try:
            await synthesize(en, path)
        except Exception as ex:  # report and keep going so one bad step doesn't block the rest
            path.unlink(missing_ok=True)  # don't leave a truncated/empty file behind
            print(f"✗ failed {info['audio']}: {ex}", file=sys.stderr)
            failed += 1
            continue
        manifest[step_id] = {"en": en, "voice": VOICE, "rate": RATE}
        save_manifest(manifest)
        print(f"✓ generated {info['audio']}")
        generated += 1

    # ---- orphans: mp3s / manifest entries with no matching step ----
    mp3_ids = {p.stem for p in AUDIO_DIR.glob("*.mp3")} if AUDIO_DIR.exists() else set()
    orphan_ids = sorted((mp3_ids | manifest.keys()) - steps.keys())

    for step_id in orphan_ids:
        mp3_path = AUDIO_DIR / f"{step_id}.mp3"
        has_file = mp3_path.exists()
        label = f"audio/{mp3_path.name}" if has_file else f"{step_id} (manifest entry only)"
        if prune:
            if has_file:
                mp3_path.unlink()
            manifest.pop(step_id, None)
            print(f"✗ pruned orphan {label}")
        else:
            print(f"! orphan {label} has no matching step (run --prune to remove)")

    if prune and orphan_ids:
        save_manifest(manifest)

    print(
        f"\n{generated} generated, {skipped} skipped, {len(orphan_ids)} orphaned"
        + (" (pruned)" if prune and orphan_ids else "")
        + (f", {failed} failed" if failed else "")
    )

    return 1 if failed else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="regenerate every step's audio")
    parser.add_argument("--prune", action="store_true", help="delete orphaned mp3s/manifest entries")
    args = parser.parse_args()

    sys.exit(asyncio.run(run(args.force, args.prune)))


if __name__ == "__main__":
    main()
