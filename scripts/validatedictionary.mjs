#!/usr/bin/env node
/**
 * validate-dictionary.mjs — build-time content contract for dictionary
 * lessons (read-only reference cards, not a quiz).
 *
 * Usage:   node validate-dictionary.mjs <file-or-dir> [...more]
 * Exit 0 = all dictionaries valid; exit 1 = contract violations (printed to stderr).
 *
 * Enforced contract:
 *   E1  dictionary.id is kebab-case; title_ru present; >= 1 entry
 *   E2  entry ids are `${dictionary.id}.${n}` with n sequential from 1
 *   E3  en, meaning_ru, example_en, example_ru, mistakes_ru all non-empty
 *   E4  en values unique across entries
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function validateDictionary(dict, file, errors) {
  const err = (msg) => errors.push(`${file}: ${msg}`);

  // E1
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(dict.id ?? ""))
    err(`dictionary.id "${dict.id}" is not kebab-case`);
  if (!dict.title_ru?.trim()) err(`title_ru is missing or empty`);
  if (!Array.isArray(dict.entries) || dict.entries.length < 1) {
    err(`entries must be a non-empty array`);
    return; // nothing else is checkable
  }

  const enSeen = new Map(); // en -> entry id

  dict.entries.forEach((entry, idx) => {
    const n = idx + 1;
    const label = entry.id ?? `entries[${idx}]`;
    const e = (msg) => err(`${label}: ${msg}`);

    // E2
    const expectedId = `${dict.id}.${n}`;
    if (entry.id !== expectedId)
      e(`id must be "${expectedId}" (sequential), got "${entry.id}"`);

    // E3
    for (const field of ["en", "meaning_ru", "example_en", "example_ru", "mistakes_ru"])
      if (!entry[field]?.trim()) e(`${field} is missing or empty`);

    // E4
    if (entry.en) {
      if (enSeen.has(entry.en)) e(`en duplicates ${enSeen.get(entry.en)}`);
      else enSeen.set(entry.en, label);
    }
  });
}

// ---- entry ----
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: node validate-dictionary.mjs <file-or-dir> [...]");
  process.exit(1);
}

const files = targets.flatMap((t) =>
  statSync(t).isDirectory()
    ? readdirSync(t).filter((f) => f.endsWith(".json")).map((f) => join(t, f))
    : [t]
);

const errors = [];
for (const file of files) {
  let dict;
  try {
    dict = JSON.parse(readFileSync(file, "utf8"));
  } catch (ex) {
    errors.push(`${file}: invalid JSON — ${ex.message}`);
    continue;
  }
  validateDictionary(dict, file, errors);
}

if (errors.length) {
  console.error(`✗ ${errors.length} contract violation(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${files.length} dictionary(ies) valid: ${files.join(", ")}`);
