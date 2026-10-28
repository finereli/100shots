// Per-device display preferences. Kept apart from the habits data on purpose:
// when sync arrives, card size is a choice about this screen, not about you.

const KEY = '100shots.prefs.v1'

interface Prefs { compact: boolean }

class PrefsStore {
  compact = $state(false)

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>
      this.compact = p.compact === true
    } catch {}
  }

  setCompact(on: boolean) {
    this.compact = on
    try { localStorage.setItem(KEY, JSON.stringify({ compact: on } satisfies Prefs)) } catch {}
  }
}

export const prefs = new PrefsStore()
