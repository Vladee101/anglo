// Ambient types for the Web Speech API recognition surface we use.
// TypeScript's DOM lib ships the result types (SpeechRecognitionResultList
// et al.) but not the recognizer itself or the window constructors.
// This file is the ONLY place these declarations live.
declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onresult: ((ev: SpeechRecognitionEvent) => void) | null
    onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
  }

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList
    readonly resultIndex: number
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}
