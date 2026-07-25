# ADR-0001: Speech-to-text for the Speak module

**Status:** Proposed
**Date:** 2026-07-17
**Deciders:** Vlad

## Context

The app is 100% web, no backend, static hosting. The Speak exercise shows a
Russian prompt and scores the learner's spoken English. Scoring is
transcription-based: STT output is compared against `accepted_en` via the
existing `matchLoose` function (loose fuzzy match; seed steps additionally
accept starts-with). Phoneme-level pronunciation scoring is explicitly out of
scope for v1.

The app code depends only on the `SpeechScorer` interface; this decision
selects its first real implementation. The interface makes a later swap a
one-file change with zero app-code impact.

Target audience: Russian speakers learning English, expected to be
predominantly on Chrome (desktop + Android) and Safari (iOS).

## Options considered

### Option A — Web Speech API (`SpeechRecognition`)

Browser-native recognition. Chrome/Edge route audio to Google's servers;
Safari uses Apple's on-device/server recognition.

| Aspect | Assessment |
|---|---|
| Cost | Free |
| Bundle / download | Zero |
| Latency | ~1 s after speech ends; effectively real-time |
| Accuracy (short EN phrases) | Good; tuned for exactly this kind of dictation |
| Offline | No (Chrome requires network) |
| Privacy | Audio leaves the device (Google/Apple servers) |
| Browser support | Chrome, Edge, Safari. **Not Firefox** |
| Implementation effort | ~1 day incl. permission/no-speech/error states |

### Option B — Whisper in-browser (transformers.js, WASM/WebGPU)

Ship a Whisper model to the client; inference runs locally.

| Aspect | Assessment |
|---|---|
| Cost | Free |
| Bundle / download | ~40 MB (tiny) to ~150 MB (base), one-time, cacheable |
| Latency | Seconds per utterance on WASM; better with WebGPU, which is not universal |
| Accuracy | tiny.en is weaker than Web Speech for short phrases; base.en comparable |
| Offline | Yes, after first model download |
| Privacy | Fully local |
| Browser support | All modern browsers incl. Firefox |
| Implementation effort | ~1 week incl. model loading UX, memory management on mobile |

### Option C — Cloud STT API (OpenAI Whisper API or similar) — rejected

Requires shipping an API key, which requires a proxy backend. Violates the
no-backend constraint and adds per-use cost. Rejected without further
analysis.

## Decision

**Option A: Web Speech API**, as `WebSpeechScorer implements SpeechScorer`,
with capability detection at app start:

- `SpeechRecognition` available → Speak exercises run normally.
- Unavailable (Firefox, or permission permanently denied) → Speak exercises
  render a "speech not supported in this browser" notice and are marked
  `skipped` in `StepProgress` (not `correct`); the chain remains completable.
  Honest degradation over fake passes.

## Rationale

Right-sized to actual constraints: the expected audience is overwhelmingly on
supported browsers, and Option A costs nothing in bundle size — the decisive
factor for mobile learners on metered connections, where a 40–150 MB model
download before the first speaking exercise is a real adoption barrier.
Accuracy on short English phrases is the core quality requirement, and Web
Speech is at least as good as whisper-tiny there. The trade-offs accepted:
no offline speaking, audio leaves the device, no Firefox.

## Consequences

- `WebSpeechScorer` handles: mic permission flow, `no-speech` timeout,
  `not-allowed` error, and mapping the top transcript into `matchLoose`.
- `StepProgress` gains a `skipped` state for the speak modality (small,
  contained schema addition).
- Privacy note ("speech is processed by your browser's speech service")
  belongs in the app's about/settings screen.

## Revisit triggers

Re-open in favor of Option B if any of these become true:

1. Offline use becomes a requirement.
2. Firefox (or another unsupported browser) shows meaningful real-user share.
3. Transcript quality proves insufficient for scoring in real-user testing.
4. Portfolio positioning: an in-browser Whisper implementation is a stronger
   Solutions Architect showcase; if the app's primary job shifts from
   "usable learning tool" to "flagship technical demo," B's costs read as
   features. This is a legitimate reason, but it should be chosen explicitly,
   not drifted into.
