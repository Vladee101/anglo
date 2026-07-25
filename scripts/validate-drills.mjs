#!/usr/bin/env node
/**
 * validate-drills.mjs — build-time content contract for single-skill drills.
 *
 * Sibling to validate-chains.mjs: drills are flat, independently-authored
 * item lists (no chaining/additivity/seed-step rules — those are specific
 * to progressive chains).
 *
 * Usage:   node validate-drills.mjs <file-or-dir> [...more]
 * Exit 0 = all drills valid; exit 1 = contract violations (printed to stderr).
 *
 * Enforced contract:
 *   D1  drill.id is kebab-case; title_ru and level present;
 *       modality is one of read/listen/write/speak; >= 1 item
 *   D2  item ids are `${drill.id}.${n}` with n sequential from 1
 *   D3  if item.audio is present, it is exactly `audio/${item.id}.mp3`
 *   D4  en, ru non-empty; accepted_en non-empty and includes en
 *   D5  every item's distractor pool (siblings + traps) >= 3 —
 *       only enforced for read/listen (write/speak never render options)
 *   D6  ru values unique across items; no trap duplicates any item's ru
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MIN_DISTRACTOR_POOL = 3; // 4 options = 1 correct + 3 distractors
const MODALITIES = ["read", "listen", "write", "speak"];

function validateDrill(drill, file, errors) {
  const err = (msg) => errors.push(`${file}: ${msg}`);

  // D1
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(drill.id ?? ""))
    err(`drill.id "${drill.id}" is not kebab-case`);
  if (!drill.title_ru?.trim()) err(`title_ru is missing or empty`);
  if (!drill.level?.trim()) err(`level is missing or empty`);
  if (!MODALITIES.includes(drill.modality))
    err(`modality must be one of ${MODALITIES.join("/")}, got "${drill.modality}"`);
  if (!Array.isArray(drill.items) || drill.items.length < 1) {
    err(`items must be a non-empty array`);
    return; // nothing else is checkable
  }

  const needsOptions = drill.modality === "read" || drill.modality === "listen";
  const ruSeen = new Map(); // ru -> item id

  drill.items.forEach((item, idx) => {
    const n = idx + 1;
    const label = item.id ?? `items[${idx}]`;
    const e = (msg) => err(`${label}: ${msg}`);

    // D2
    const expectedId = `${drill.id}.${n}`;
    if (item.id !== expectedId)
      e(`id must be "${expectedId}" (sequential), got "${item.id}"`);

    // D3
    if (item.audio !== undefined) {
      const expectedAudio = `audio/${expectedId}.mp3`;
      if (item.audio !== expectedAudio)
        e(`audio must be "${expectedAudio}", got "${item.audio}"`);
    }

    // D4
    for (const field of ["en", "ru"])
      if (!item[field]?.trim()) e(`${field} is missing or empty`);
    if (!Array.isArray(item.accepted_en) || item.accepted_en.length === 0)
      e(`accepted_en must be a non-empty array`);
    else if (!item.accepted_en.includes(item.en))
      e(`accepted_en must include the canonical en "${item.en}"`);

    const traps = item.trap_distractors_ru ?? [];

    // D5 — siblings are every other item in the drill
    if (needsOptions) {
      const pool = (drill.items.length - 1) + traps.length;
      if (pool < MIN_DISTRACTOR_POOL)
        e(`distractor pool too small: ${pool} (siblings + traps), need >= ${MIN_DISTRACTOR_POOL}`);
    }

    // D6 (collect)
    if (item.ru) {
      if (ruSeen.has(item.ru))
        e(`ru duplicates ${ruSeen.get(item.ru)}`);
      else ruSeen.set(item.ru, label);
    }
  });

  // D6 (traps vs item ru)
  drill.items.forEach((item) => {
    for (const trap of item.trap_distractors_ru ?? [])
      if (ruSeen.has(trap))
        err(`${item.id}: trap "${trap}" duplicates an item's ru (${ruSeen.get(trap)})`);
  });
}

// ---- entry ----
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: node validate-drills.mjs <file-or-dir> [...]");
  process.exit(1);
}

const files = targets.flatMap((t) =>
  statSync(t).isDirectory()
    ? readdirSync(t).filter((f) => f.endsWith(".json")).map((f) => join(t, f))
    : [t]
);

const errors = [];
for (const file of files) {
  let drill;
  try {
    drill = JSON.parse(readFileSync(file, "utf8"));
  } catch (ex) {
    errors.push(`${file}: invalid JSON — ${ex.message}`);
    continue;
  }
  validateDrill(drill, file, errors);
}

if (errors.length) {
  console.error(`✗ ${errors.length} contract violation(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${files.length} drill(s) valid: ${files.join(", ")}`);
