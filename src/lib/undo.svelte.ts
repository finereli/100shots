// One undo slot, shown as a snackbar. A new action replaces the old offer:
// the snackbar is for "oops, wrong card", not a history.
//
// An offer can also take a note (a logged shot does): the bar shows a Note
// button that turns it into a one-line field in place. Typing stops the
// timer; a new offer saves whatever was typed before it replaces the bar.

type Offer = { id: number; text: string; run: () => void; note?: (text: string) => void; placeholder?: string }

class Undo {
  current = $state<Offer | null>(null)
  editing = $state(false)
  draft = $state('')
  #timer: ReturnType<typeof setTimeout> | undefined
  #id = 0

  offer(text: string, run: () => void, ms = 5000, extra: { note?: (text: string) => void; placeholder?: string } = {}) {
    this.saveNote()
    clearTimeout(this.#timer)
    const id = ++this.#id
    this.current = { id, text, run, ...extra }
    this.#timer = setTimeout(() => this.dismiss(id), ms)
  }

  run() {
    const c = this.current
    if (!c) return
    this.dismiss(c.id)
    c.run()
  }

  // Open the note field: the bar stays until the note is saved or dropped.
  startNote() {
    if (!this.current?.note) return
    clearTimeout(this.#timer)
    this.draft = ''
    this.editing = true
  }

  // Save what was typed (empty saves nothing) and close the bar.
  saveNote() {
    if (!this.editing) return
    const c = this.current
    const text = this.draft.trim()
    this.editing = false
    this.draft = ''
    if (c?.note && text) c.note(text)
    if (c) this.dismiss(c.id)
  }

  cancelNote() {
    this.draft = ''
    this.saveNote()
  }

  dismiss(id?: number) {
    if (id !== undefined && this.current?.id !== id) return
    clearTimeout(this.#timer)
    this.editing = false
    this.draft = ''
    this.current = null
  }
}

export const undo = new Undo()
