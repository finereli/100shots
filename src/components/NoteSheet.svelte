<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { habits, shotLabel } from '../lib/habits.svelte'
  import { noteSheet } from '../lib/note-sheet.svelte'

  // A bottom sheet with room to write. Whatever you typed is kept unless you
  // say otherwise: Save, a tap outside and the back button all save; only
  // Cancel (or Skip, or Escape) drops the edit.

  const t = $derived(noteSheet.current)
  const habit = $derived(t ? habits.byId(t.habitId) : undefined)
  const index = $derived(habit && t ? habit.shots.findIndex((s) => s.id === t.shotId) : -1)
  const shot = $derived(habit && index >= 0 ? habit.shots[index] : undefined)

  let draft = $state('')
  let sheet = $state<HTMLElement>()
  let returnTo: HTMLElement | null = null
  let pushed = false

  const timeFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const changed = $derived(draft.trim() !== (shot?.note ?? ''))

  // Each opening: load the note, remember where focus was, and take one
  // history entry so the phone's back button closes the sheet, not the page.
  let openFor: string | null = null
  $effect.pre(() => {
    const id = t ? t.shotId : null
    if (id === openFor) return
    openFor = id
    if (!t) return
    draft = shot?.note ?? ''
    returnTo = document.activeElement as HTMLElement | null
    history.pushState({ noteSheet: true }, '')
    pushed = true
  })

  $effect(() => {
    if (!t) return
    const onPop = () => { pushed = false; close(true) }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  })

  // The shot went away (deleted on another device): nothing to write on.
  $effect(() => { if (t && !shot) close(false) })

  function close(save: boolean) {
    const cur = noteSheet.current
    if (!cur) return
    let saved = false
    if (save && changed && shot) {
      habits.setNote(cur.habitId, cur.shotId, draft)
      saved = true
    }
    noteSheet.current = null
    openFor = null
    if (pushed) { pushed = false; history.back() }
    returnTo?.focus?.({ preventScroll: true })
    cur.onclose?.(saved)
  }

  function focus(node: HTMLTextAreaElement) {
    node.focus()
    // Editing an old note: start at the end of it.
    node.setSelectionRange(node.value.length, node.value.length)
  }

  // Tab stays inside the sheet; Escape is Cancel.
  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(false); return }
    if (e.key !== 'Tab' || !sheet) return
    const f = [...sheet.querySelectorAll<HTMLElement>('textarea, button')]
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
</script>

{#if t && habit && shot}
  <div class="scrim" transition:fade={{ duration: 150 }} onclick={() => close(true)} aria-hidden="true"></div>
  <div
    class="sheet"
    bind:this={sheet}
    role="dialog"
    aria-modal="true"
    aria-labelledby="note-title"
    tabindex="-1"
    onkeydown={keydown}
    transition:fly={{ y: 40, duration: 200 }}
  >
    <header>
      <h2 id="note-title">{habit.name}</h2>
      <p>Shot {shotLabel(index)} · {timeFmt.format(shot.at)}</p>
    </header>
    <textarea
      use:focus
      bind:value={draft}
      maxlength="4000"
      placeholder={t.fresh ? 'How did it go? What will you try next time?' : 'What happened on this one?'}
      aria-label="Note"
    ></textarea>
    <div class="actions">
      <button class="quiet" onclick={() => close(false)}>
        {t.fresh && !draft.trim() ? 'Skip' : 'Cancel'}
      </button>
      <button class="save" onclick={() => close(true)} disabled={!changed}>
        {shot.note && !draft.trim() ? 'Remove note' : 'Save'}
      </button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(20, 12, 8, 0.4);
  }
  /* Fixed to the shell's visible area, which shrinks with the keyboard, so
     the sheet always sits right above it. */
  .sheet {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 101;
    margin: 0 auto;
    max-width: 620px;
    height: min(30rem, calc(100% - 40px));
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 16px calc(var(--safe-bottom) + 12px);
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.18);
    outline: none;
  }
  header { padding: 0 2px; }
  h2 { font-size: 1.1rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header p { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
  textarea {
    flex: 1;
    min-height: 0;
    width: 100%;
    resize: none;
    font-size: 1rem; /* 16px: iOS doesn't zoom into the field */
    line-height: 1.5;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg-surface);
    outline: none;
  }
  textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  .actions button { min-height: 44px; padding: 0 18px; border-radius: 12px; font-size: 0.95rem; font-weight: 500; }
  .quiet { color: var(--text-secondary); }
  .quiet:hover { background: var(--bg-hover); }
  .save { background: var(--accent); color: #fff; }
  .save:disabled { opacity: 0.45; }
</style>
