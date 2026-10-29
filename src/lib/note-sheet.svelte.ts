// The note sheet: one at a time, opened after a shot (when asking is on),
// from the bar's Note button, or by tapping a shot in a habit's history.
// NoteSheet.svelte (mounted once in App) renders it and saves.

import { flushSync } from 'svelte'

export type NoteTarget = {
  habitId: string
  shotId: string
  // Just logged: the left button reads Skip instead of Cancel.
  fresh?: boolean
  // Told whether a note was saved, once the sheet is gone.
  onclose?: (saved: boolean) => void
}

class NoteSheet {
  current = $state<NoteTarget | null>(null)

  open(t: NoteTarget) {
    this.current = t
    // Render now, inside the tap, so focusing the field opens the keyboard
    // (iOS only does that for focus within the user's gesture).
    flushSync()
  }
}

export const noteSheet = new NoteSheet()
