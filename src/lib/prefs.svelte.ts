// Per-device preferences. Kept apart from the habits data on purpose: when
// sync runs, card size and how you like to take notes are choices about this
// screen, not about your shots.

const KEY = '100shots.prefs.v1'

interface Prefs { compact: boolean; askNote: boolean }

class PrefsStore {
  compact = $state(false)
  // Open the note sheet after every shot. On unless turned off.
  askNote = $state(true)

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>
      this.compact = p.compact === true
      this.askNote = p.askNote !== false
    } catch {}
  }

  #save() {
    try { localStorage.setItem(KEY, JSON.stringify({ compact: this.compact, askNote: this.askNote } satisfies Prefs)) } catch {}
  }

  setCompact(on: boolean) { this.compact = on; this.#save() }
  setAskNote(on: boolean) { this.askNote = on; this.#save() }
}

export const prefs = new PrefsStore()
