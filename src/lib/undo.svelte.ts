// One undo slot, shown as a snackbar. A new action replaces the old offer:
// the snackbar is for "oops, wrong card", not a history. An offer can carry
// one more button before Undo (a logged shot's Note, when the app isn't
// asking for notes on its own).

type Action = { label: string; run: () => void }
type Offer = { id: number; text: string; run: () => void; action?: Action }

class Undo {
  current = $state<Offer | null>(null)
  #timer: ReturnType<typeof setTimeout> | undefined
  #id = 0

  offer(text: string, run: () => void, ms = 5000, action?: Action) {
    clearTimeout(this.#timer)
    const id = ++this.#id
    this.current = { id, text, run, action }
    this.#timer = setTimeout(() => this.dismiss(id), ms)
  }

  run() {
    const c = this.current
    if (!c) return
    this.dismiss(c.id)
    c.run()
  }

  act() {
    const c = this.current
    if (!c?.action) return
    this.dismiss(c.id)
    c.action.run()
  }

  dismiss(id?: number) {
    if (id !== undefined && this.current?.id !== id) return
    clearTimeout(this.#timer)
    this.current = null
  }
}

export const undo = new Undo()
