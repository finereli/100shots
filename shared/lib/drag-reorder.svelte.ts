// pwa-kit: reorder/lib/drag-reorder.svelte.ts v1
// Drag-to-reorder for vertical lists, built on pointer events so it works
// on touch (HTML5 drag & drop does not). One controller per list.
//
// 100 Shots addition (candidate for the kit): `press`, a long-press start
// for rows with no handle. See the comment on `press` below.
//
// Usage:
//   const reorder = new DragReorder({
//     onstart: () => (snapshot = items),          // for revert on failure
//     onmove: (from, to) => { /* move items[from] to `to` locally */ },
//     ondrop: () => { /* commit the new order (optimistic, see toast/) */ },
//     scrollEl: () => document.querySelector('main'),
//   })
//   <div class="row" use:reorder.row={i}
//        class:dragging={reorder.dragIndex === i} style={reorder.styleFor(i)}>
//     <button class="drag-handle" use:reorder.handle={i}>⋮⋮</button>
//     ...
//   </div>
//
// The handle MUST have `touch-action: none; user-select: none` - that is
// what keeps the rest of the list scrollable on touch while the handle
// starts a drag immediately. Give `.row.dragging` position: relative,
// a z-index and a shadow.
//
// Mechanics: the dragged row follows the pointer via translateY. When the
// pointer crosses the midpoint of a neighbor row, onmove() reorders the
// array; the DOM move is measured across tick() and subtracted from the
// offset so the row stays under the finger - this makes variable row
// heights and gaps work without any configuration. Near the scroll
// container's edges an rAF loop autoscrolls and re-runs the swap check.
// No FLIP animation on neighbors: mid-animation rects would re-trigger
// swaps and jitter; the instant shift reads fine.
import { tick } from 'svelte'

type Options = {
  /** Called once when a drag starts - snapshot state for revert here. */
  onstart?: () => void
  /** Move the item at `from` to `to` in the local order (synchronously). */
  onmove: (from: number, to: number) => void
  /** Drag ended - commit the current order. */
  ondrop: () => void
  /** Scroll container for edge autoscroll (default: the document). */
  scrollEl?: () => HTMLElement | null
  /** Distance from the container edge that starts autoscroll (px). */
  edge?: number
  /** Fastest autoscroll, px per frame. */
  maxSpeed?: number
  /** `press` only: how long to hold before the drag starts (ms). */
  pressDelay?: number
  /** `press` only: movement that cancels the press, so it scrolls instead (px). */
  pressSlop?: number
}

export class DragReorder {
  dragIndex = $state<number | null>(null)
  offset = $state(0)

  #rows = new Map<HTMLElement, number>()
  #opts: Options
  #pointerY = 0
  #raf = 0
  #busy = false

  constructor(opts: Options) {
    this.#opts = opts
  }

  /** Svelte action for each row element; param is the row's index. */
  row = (node: HTMLElement, index: number) => {
    this.#rows.set(node, index)
    return {
      update: (i: number) => {
        this.#rows.set(node, i)
      },
      destroy: () => {
        this.#rows.delete(node)
      },
    }
  }

  /** Svelte action for the drag handle inside row `index`. */
  handle = (node: HTMLElement, index: number) => {
    let i = index
    // Listen on the window during a drag, NOT via setPointerCapture on the
    // handle: reordering the keyed each moves the row's DOM node, and
    // moving a captured element silently releases the capture - the drag
    // would die after the first swap.
    const down = (e: PointerEvent) => this.#start(e, i)
    node.addEventListener('pointerdown', down)
    return {
      update: (ni: number) => {
        i = ni
      },
      destroy: () => {
        node.removeEventListener('pointerdown', down)
      },
    }
  }

  /**
   * Svelte action: hold anywhere on the row to start a drag, for rows with
   * no handle. Put it on the row element itself (next to `row`). Elements
   * marked `data-no-drag` (the row's own buttons) never start one.
   *
   * The row keeps `touch-action: auto`, so a finger that moves before the
   * delay is a scroll and the press is dropped. Once the drag starts, a
   * non-passive touchmove listener on the row cancels scrolling. It is
   * attached up front, not at drag start: Chrome decides whether touchmoves
   * can block scrolling from the listeners present when the touch begins.
   * The click that ends a drag is swallowed so the row doesn't also open.
   * The row needs `-webkit-touch-callout: none; user-select: none`.
   *
   * A finger drag is driven by touch events, not pointer events. Android
   * Chrome cancels the pointer stream of a touch that started with
   * `touch-action: auto` (or loses it when a swap moves the row's node), so
   * the row dropped out from under the finger as soon as it left the card.
   * Touch events stay bound to the element the finger first touched, which
   * travels with the row, so the row's own listeners see the whole drag.
   */
  press = (node: HTMLElement, index: number) => {
    let i = index
    let timer: ReturnType<typeof setTimeout> | undefined
    let x0 = 0
    let y0 = 0
    let y = 0
    let touch = false
    const delay = this.#opts.pressDelay ?? 400
    const slop = this.#opts.pressSlop ?? 8

    const cancel = () => {
      clearTimeout(timer)
      timer = undefined
      window.removeEventListener('pointermove', watch)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
    const watch = (e: PointerEvent) => {
      y = e.clientY
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > slop) cancel()
    }
    const down = (e: PointerEvent) => {
      if (this.dragIndex !== null || !e.isPrimary || e.button !== 0) return
      if ((e.target as Element).closest('[data-no-drag]')) return
      x0 = e.clientX
      y0 = y = e.clientY
      touch = e.pointerType === 'touch'
      window.addEventListener('pointermove', watch)
      window.addEventListener('pointerup', cancel)
      window.addEventListener('pointercancel', cancel)
      timer = setTimeout(() => {
        cancel()
        this.#swallowClick = true
        this.#begin(i, y, touch)
      }, delay)
    }
    const touchmove = (e: TouchEvent) => {
      if (this.dragIndex === null) return
      if (e.cancelable) e.preventDefault()
      const t = e.touches[0]
      if (this.#touchDrag && t) this.#moveTo(t.clientY)
    }
    const touchend = () => {
      if (this.#touchDrag) this.#end()
    }
    // Android shows a context menu on a long press; never during a drag.
    const menu = (e: Event) => {
      if (timer || this.dragIndex !== null) e.preventDefault()
    }

    node.addEventListener('pointerdown', down)
    node.addEventListener('touchmove', touchmove, { passive: false })
    node.addEventListener('touchend', touchend)
    node.addEventListener('touchcancel', touchend)
    node.addEventListener('contextmenu', menu)
    return {
      update: (ni: number) => {
        i = ni
      },
      destroy: () => {
        cancel()
        node.removeEventListener('pointerdown', down)
        node.removeEventListener('touchmove', touchmove)
        node.removeEventListener('touchend', touchend)
        node.removeEventListener('touchcancel', touchend)
        node.removeEventListener('contextmenu', menu)
      },
    }
  }

  #swallowClick = false
  #touchDrag = false

  #onMove = (e: PointerEvent) => this.#moveTo(e.clientY)
  #onUp = () => this.#end()

  /** Inline style for row `index` (the dragged row's translate). */
  styleFor(index: number) {
    return this.dragIndex === index ? `transform: translateY(${this.offset}px)` : ''
  }

  #nodeAt(index: number): HTMLElement | null {
    for (const [node, i] of this.#rows) if (i === index) return node
    return null
  }

  #start(e: PointerEvent, index: number) {
    if (this.dragIndex !== null || !e.isPrimary) return
    e.preventDefault()
    this.#begin(index, e.clientY)
  }

  // `touch`: the row's touch listeners drive the drag (see `press`), and the
  // window's only job is to catch the touch ending somewhere unexpected.
  #begin(index: number, y: number, touch = false) {
    this.dragIndex = index
    this.offset = 0
    this.#pointerY = y
    this.#touchDrag = touch
    if (touch) {
      window.addEventListener('touchend', this.#onUp)
      window.addEventListener('touchcancel', this.#onUp)
    } else {
      window.addEventListener('pointermove', this.#onMove)
      window.addEventListener('pointerup', this.#onUp)
      window.addEventListener('pointercancel', this.#onUp)
    }
    document.body.style.userSelect = 'none'
    this.#opts.onstart?.()
    this.#raf = requestAnimationFrame(this.#autoscroll)
  }

  #moveTo(y: number) {
    if (this.dragIndex === null) return
    const dy = y - this.#pointerY
    this.#pointerY = y
    this.offset += dy
    this.#settle()
  }

  // Swap with a neighbor once the pointer crosses its midpoint. The DOM
  // move is measured across tick() so the dragged row stays under the
  // finger whatever the neighbor's height.
  async #settle() {
    if (this.#busy || this.dragIndex === null) return
    this.#busy = true
    try {
      let swapped = true
      while (swapped && this.dragIndex !== null) {
        swapped = false
        const node = this.#nodeAt(this.dragIndex)
        if (!node) break
        const next = this.#nodeAt(this.dragIndex + 1)
        if (next) {
          const r = next.getBoundingClientRect()
          if (this.#pointerY > r.top + r.height / 2) {
            await this.#swap(1, node)
            swapped = true
            continue
          }
        }
        const prev = this.#nodeAt(this.dragIndex - 1)
        if (prev) {
          const r = prev.getBoundingClientRect()
          if (this.#pointerY < r.top + r.height / 2) {
            await this.#swap(-1, node)
            swapped = true
          }
        }
      }
    } finally {
      this.#busy = false
    }
  }

  async #swap(dir: number, node: HTMLElement) {
    const from = this.dragIndex!
    const before = node.getBoundingClientRect().top
    this.#opts.onmove(from, from + dir)
    this.dragIndex = from + dir
    await tick()
    const after = node.getBoundingClientRect().top
    this.offset -= after - before
  }

  #autoscroll = () => {
    if (this.dragIndex === null) return
    const el = this.#opts.scrollEl?.() ?? (document.scrollingElement as HTMLElement | null)
    if (el) {
      const isDoc = el === document.scrollingElement
      const top = isDoc ? 0 : el.getBoundingClientRect().top
      const bottom = isDoc ? window.innerHeight : el.getBoundingClientRect().bottom
      const edge = this.#opts.edge ?? 48
      const maxSpeed = this.#opts.maxSpeed ?? 12
      let dy = 0
      if (this.#pointerY < top + edge) {
        dy = -Math.ceil(Math.min(1, (top + edge - this.#pointerY) / edge) * maxSpeed)
      } else if (this.#pointerY > bottom - edge) {
        dy = Math.ceil(Math.min(1, (this.#pointerY - (bottom - edge)) / edge) * maxSpeed)
      }
      if (dy) {
        const before = el.scrollTop
        el.scrollTop += dy
        const scrolled = el.scrollTop - before
        if (scrolled) {
          // The row's layout position moved with the scroll; compensate to
          // keep it under the finger, then re-check for swaps.
          this.offset += scrolled
          this.#settle()
        }
      }
    }
    this.#raf = requestAnimationFrame(this.#autoscroll)
  }

  #end() {
    if (this.dragIndex === null) return
    cancelAnimationFrame(this.#raf)
    window.removeEventListener('pointermove', this.#onMove)
    window.removeEventListener('pointerup', this.#onUp)
    window.removeEventListener('pointercancel', this.#onUp)
    window.removeEventListener('touchend', this.#onUp)
    window.removeEventListener('touchcancel', this.#onUp)
    this.#touchDrag = false
    document.body.style.userSelect = ''
    this.dragIndex = null
    this.offset = 0
    if (this.#swallowClick) {
      this.#swallowClick = false
      // The pointerup that ended a press-drag is followed by a click on the
      // row: eat it in the capture phase. Touch browsers can send that click
      // a beat later, so the trap stays briefly, then goes in case no click
      // comes at all (the pointer ended outside the row).
      const eat = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
      }
      window.addEventListener('click', eat, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 400)
    }
    this.#opts.ondrop()
  }
}
