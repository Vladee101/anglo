#!/usr/bin/env node
/**
 * validate-chains.mjs — build-time content contract for ESL quiz chains.
 *
 * Usage:   node validate-chains.mjs [--assets] <file-or-dir> [...more]
 * Exit 0 = all chains valid; exit 1 = contract violations (printed to stderr).
 *
 * Enforced contract (approved design decisions):
 *   C1  chain.id is kebab-case; title_ru present; >= 2 steps
 *   C2  step ids are `${chain.id}.${n}` with n sequential from 1
 *   C3  audio path is exactly `audio/${step.id}.mp3`
 *   C4  en, ru, new_part non-empty; accepted_en non-empty and includes en
 *   C5  seed step (step 1): new_part === en, trap_distractors_ru >= 3
 *   C6  every step's distractor pool (siblings + traps) >= 3 (for 4 options)
 *   C7  EN is purely additive: prev step's words ⊆ current step's words
 *       (multiset), and added words === new_part words (steps >= 2)
 *   C8  ru values unique across steps; no trap duplicates any step's ru
 *
 * With --assets, additionally enforces (checked against public/, the
 * generated-audio output — see scripts/generate-audio.py; content authoring
 * itself must not require assets to exist, hence these are opt-in):
 *   C9  every step's audio file exists at public/<step.audio>
 *   C10 no orphan mp3s in public/audio/ (files with no matching step across
 *       all chains being validated, and no matching item in drills/*.json
 *       either — chains and drills share the same audio folder;
 *       manifest.json is exempt)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MIN_DISTRACTOR_POOL = 3; // 4 options = 1 correct + 3 distractors
const MIN_SEED_TRAPS = 3;      // seed step has no earlier siblings
const PUBLIC_DIR = "public";
const DRILLS_DIR = "drills";

/** Audio paths declared by drills/*.json, exempt from the C10 orphan check
 *  since chains and drills share the same public/audio/ folder. Best-effort:
 *  drills aren't otherwise this script's concern, so malformed files are
 *  silently skipped here (validate-drills.mjs is their contract owner). */
function drillDeclaredAudio() {
  const declared = new Set();
  if (!existsSync(DRILLS_DIR)) return declared;
  for (const f of readdirSync(DRILLS_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const drill = JSON.parse(readFileSync(join(DRILLS_DIR, f), "utf8"));
      for (const item of drill.items ?? []) if (item.audio) declared.add(item.audio);
    } catch {
      // malformed drill JSON — not this script's problem to report
    }
  }
  return declared;
}

const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Multiset subtract: a - b. Returns leftover of a, or null if b ⊄ a. */
function multisetDiff(a, b) {
  const pool = [...a];
  for (const w of b) {
    const i = pool.indexOf(w);
    if (i === -1) return null;
    pool.splice(i, 1);
  }
  return pool;
}

function validateChain(chain, file, errors, assets, expectedAudioFiles) {
  const err = (msg) => errors.push(`${file}: ${msg}`);

  // C1
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(chain.id ?? ""))
    err(`chain.id "${chain.id}" is not kebab-case`);
  if (!chain.title_ru?.trim()) err(`title_ru is missing or empty`);
  if (!Array.isArray(chain.steps) || chain.steps.length < 2) {
    err(`steps must be an array with >= 2 entries`);
    return; // nothing else is checkable
  }

  const ruSeen = new Map(); // ru -> step id
  chain.steps.forEach((step, idx) => {
    const n = idx + 1;
    const label = step.id ?? `steps[${idx}]`;
    const e = (msg) => err(`${label}: ${msg}`);

    // C2
    const expectedId = `${chain.id}.${n}`;
    if (step.id !== expectedId)
      e(`id must be "${expectedId}" (sequential), got "${step.id}"`);

    // C3
    const expectedAudio = `audio/${expectedId}.mp3`;
    if (step.audio !== expectedAudio)
      e(`audio must be "${expectedAudio}", got "${step.audio}"`);

    // C9 (assets only) — checked against the declared path, independent of C3
    if (assets && step.audio) {
      expectedAudioFiles.add(step.audio);
      const audioPath = join(PUBLIC_DIR, step.audio);
      if (!existsSync(audioPath)) e(`audio file missing: ${audioPath}`);
    }

    // C4
    for (const field of ["en", "ru", "new_part"])
      if (!step[field]?.trim()) e(`${field} is missing or empty`);
    if (!Array.isArray(step.accepted_en) || step.accepted_en.length === 0)
      e(`accepted_en must be a non-empty array`);
    else if (!step.accepted_en.includes(step.en))
      e(`accepted_en must include the canonical en "${step.en}"`);

    const traps = step.trap_distractors_ru ?? [];

    // C5
    if (n === 1) {
      if (step.new_part !== step.en)
        e(`seed step new_part must equal en`);
      if (traps.length < MIN_SEED_TRAPS)
        e(`seed step needs >= ${MIN_SEED_TRAPS} trap_distractors_ru, has ${traps.length}`);
    }

    // C6 — siblings are every other step in the chain
    const pool = (chain.steps.length - 1) + traps.length;
    if (pool < MIN_DISTRACTOR_POOL)
      e(`distractor pool too small: ${pool} (siblings + traps), need >= ${MIN_DISTRACTOR_POOL}`);

    // C7 — EN additivity + new_part accounting
    if (n >= 2 && step.en && chain.steps[idx - 1]?.en) {
      const added = multisetDiff(words(step.en), words(chain.steps[idx - 1].en));
      if (added === null)
        e(`en is not additive: previous step's words are not all present`);
      else if (step.new_part) {
        const leftover = multisetDiff(added, words(step.new_part));
        if (leftover === null || leftover.length > 0)
          e(`new_part "${step.new_part}" != added words [${added.join(" ")}]`);
      }
    }

    // C8 (collect)
    if (step.ru) {
      if (ruSeen.has(step.ru))
        e(`ru duplicates ${ruSeen.get(step.ru)}`);
      else ruSeen.set(step.ru, label);
    }
  });

  // C8 (traps vs step ru)
  chain.steps.forEach((step) => {
    for (const trap of step.trap_distractors_ru ?? [])
      if (ruSeen.has(trap))
        err(`${step.id}: trap "${trap}" duplicates a step's ru (${ruSeen.get(trap)})`);
  });
}

// ---- entry ----
const argv = process.argv.slice(2);
const assets = argv.includes("--assets");
const targets = argv.filter((a) => a !== "--assets");
if (targets.length === 0) {
  console.error("usage: node validate-chains.mjs [--assets] <file-or-dir> [...]");
  process.exit(1);
}

const files = targets.flatMap((t) =>
  statSync(t).isDirectory()
    ? readdirSync(t).filter((f) => f.endsWith(".json")).map((f) => join(t, f))
    : [t]
);

const errors = [];
const expectedAudioFiles = new Set();
for (const file of files) {
  let chain;
  try {
    chain = JSON.parse(readFileSync(file, "utf8"));
  } catch (ex) {
    errors.push(`${file}: invalid JSON — ${ex.message}`);
    continue;
  }
  validateChain(chain, file, errors, assets, expectedAudioFiles);
}

// C10 (assets only)
if (assets) {
  const audioDir = join(PUBLIC_DIR, "audio");
  if (existsSync(audioDir)) {
    const drillAudio = drillDeclaredAudio();
    for (const f of readdirSync(audioDir).filter((f) => f.endsWith(".mp3"))) {
      const rel = `audio/${f}`;
      if (!expectedAudioFiles.has(rel) && !drillAudio.has(rel))
        errors.push(`${audioDir}: orphan mp3 "${f}" has no matching step`);
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} contract violation(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${files.length} chain(s) valid: ${files.join(", ")}`);
