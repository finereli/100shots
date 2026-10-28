<script lang="ts">
  import Icon from './Icon.svelte'
  import ConfirmButton from '$shared/ui/ConfirmButton.svelte'
  import { habits, shotsToday, TARGET, type Habit } from '../lib/habits.svelte'
  import { undo } from '../lib/undo.svelte'
  import { router } from '../lib/router.svelte'

  let { habit, compact = false }: { habit: Habit; compact?: boolean } = $props()

  const n = $derived(habit.shots.length)
  // A countdown, never a counter: how many of the hundred are left.
  const left = $derived(Math.max(TARGET - n, 0))
  const done = $derived(n >= TARGET)
  const today = $derived(shotsToday(habit))
  const progress = $derived(Math.min(n, TARGET) / TARGET)
  let pop = $state(0)
  let lastTap = 0

  let menuOpen = $state(false)
  let renaming = $state(false)
  let draft = $state('')
  let nameInput = $state<HTMLInputElement>()
  let menuEl = $state<HTMLElement>()

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation()
    menuOpen = !menuOpen
  }

  // Outside tap or Escape closes the menu.
  $effect(() => {
    if (!menuOpen) return
    // The tap that closes the menu does only that: its click is swallowed,
    // so it doesn't also open the card underneath.
    const swallow = (e: Event) => { e.stopPropagation(); e.preventDefault() }
    const close = (e: Event) => {
      if (menuEl?.contains(e.target as Node)) return
      menuOpen = false
      addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => removeEventListener('click', swallow, true), 600)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (menuOpen = false)
    addEventListener('pointerdown', close, true)
    addEventListener('keydown', esc)
    return () => { removeEventListener('pointerdown', close, true); removeEventListener('keydown', esc) }
  })

  function startRename() {
    menuOpen = false
    draft = habit.name
    renaming = true
  }
  $effect(() => { if (renaming) { nameInput?.focus(); nameInput?.select() } })

  function finishRename(save: boolean) {
    if (!renaming) return
    renaming = false
    if (save && draft.trim()) habits.rename(habit.id, draft)
  }

  function del() {
    menuOpen = false
    const index = habits.list.indexOf(habit)
    const h = habits.remove(habit.id)
    if (h) undo.offer(`Deleted ${h.name}`, () => habits.restore(h, index), 7000)
  }

  function shoot(e: MouseEvent) {
    e.stopPropagation()
    // A double tap is almost always a bounce, not two attempts.
    const now = Date.now()
    if (now - lastTap < 700) return
    lastTap = now
    const s = habits.shoot(habit.id)
    if (!s) return
    pop++
    navigator.vibrate?.(12)
    undo.offer(`${habit.name}: ${Math.max(TARGET - n, 0)} left`, () => habits.removeShot(habit.id, s.id), 5000, {
      note: (text) => habits.setNote(habit.id, s.id, text),
      placeholder: `Note on ${habit.name}`,
    })
  }

  function undoLast(e: MouseEvent) {
    e.stopPropagation()
    const r = habits.undoLast(habit.id)
    if (r) undo.offer(`Shot removed, ${Math.max(TARGET - n, 0)} left`, () => habits.restoreShot(habit.id, r.shot))
  }
</script>

<article class="card" class:done class:compact>
  <button class="open" onclick={() => router.go(`/h/${habit.id}`)} aria-label="Open {habit.name}"></button>

  {#if compact}
    <!-- Small card: the countdown, the name, today's count, a thin progress
         bar and the button. The 100 dots become the bar. The menu and Undo
         go: the snackbar offers undo after every shot, and the habit's page
         renames, fixes shots and deletes. -->
    <div class="row">
      <div class="count">
        {#key pop}<span class="num" class:popped={pop > 0}>{left}</span>{/key}
        <span class="label">{done ? 'done' : 'left'}</span>
      </div>
      <div class="info">
        <div class="line">
          <h2>{habit.name}</h2>
          {#if today}<span class="today">{today} today</span>{/if}
        </div>
        <span class="bar" aria-hidden="true"><span style="width: {progress * 100}%"></span></span>
      </div>
      <button class="shoot" data-no-drag onclick={shoot} aria-label="Log a shot, {left} left">
        <Icon name="check" size={30} />
      </button>
    </div>
  {:else}
  <header>
    {#if renaming}
      <form class="rename" data-no-drag onsubmit={(e) => { e.preventDefault(); finishRename(true) }}>
        <input
          bind:this={nameInput}
          bind:value={draft}
          maxlength="60"
          enterkeyhint="done"
          aria-label="Habit name"
          onblur={() => finishRename(true)}
          onkeydown={(e) => e.key === 'Escape' && finishRename(false)}
        />
      </form>
    {:else}
      <h2>{habit.name}</h2>
      {#if today}<span class="today">{today} today</span>{/if}
    {/if}
  </header>

  <div class="main">
    <div class="count">
      {#key pop}<span class="num" class:popped={pop > 0}>{left}</span>{/key}
      <span class="label">{done ? 'left. All 100 done.' : 'left'}</span>
    </div>
    <button class="shoot" data-no-drag onclick={shoot} aria-label="Log a shot, {left} left">
      <Icon name="check" size={40} />
    </button>
  </div>

  <div class="dots" aria-hidden="true">
    {#each { length: TARGET } as _, i}
      <span class:on={i < n}></span>
    {/each}
  </div>

  <footer>
    <div class="menu-wrap" data-no-drag bind:this={menuEl}>
      <button class="kebab" onclick={toggleMenu} aria-label="Options for {habit.name}" aria-haspopup="menu" aria-expanded={menuOpen}>
        <Icon name="more_vert" size={20} />
      </button>
      {#if menuOpen}
        <div class="menu" role="menu">
          <button role="menuitem" onclick={startRename}><Icon name="edit" size={20} /> Rename</button>
          <button role="menuitem" onclick={() => router.go(`/h/${habit.id}`)}><Icon name="history" size={20} /> Shot history</button>
          <ConfirmButton class="menu-delete" onconfirm={del}>
            <Icon name="delete" size={20} /> Delete
          </ConfirmButton>
        </div>
      {/if}
    </div>
    {#if n > 0}
      <button class="undo" data-no-drag onclick={undoLast} aria-label="Undo last shot">
        <Icon name="undo" size={16} /> Undo
      </button>
    {/if}
  </footer>
  {/if}
</article>

<style>
  .card {
    position: relative;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 16px 18px 10px;
    box-shadow: var(--shadow-card);
    transition: border-color 0.15s, transform 0.12s, box-shadow 0.15s;
    /* Holding a card picks it up to reorder: no text selection or iOS
       callout on the long press. */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  @media (hover: hover) { .card:hover { border-color: var(--accent-light); } }
  .card:has(.open:active) { transform: scale(0.99); }
  /* The whole card opens the habit; the buttons sit above this layer. */
  .open { position: absolute; inset: 0; border-radius: inherit; z-index: 0; }
  header, .main, footer, .row { position: relative; z-index: 1; pointer-events: none; }
  .shoot, .undo, .kebab, .menu, .rename { pointer-events: auto; }

  header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  h2 {
    font-size: 1.05rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .today {
    flex: none;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 2px 9px;
    border-radius: 99px;
  }

  .main { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 12px; }
  .count { display: flex; align-items: baseline; gap: 8px; }
  .num {
    font-family: var(--font-num);
    font-size: 3.2rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
    display: inline-block;
    transform-origin: left center;
  }
  .popped { animation: pop 0.28s cubic-bezier(0.3, 1.6, 0.6, 1); }
  @keyframes pop { from { transform: scale(0.8); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
  .label { font-size: 1.1rem; color: var(--text-secondary); }
  .done .num { color: var(--accent); }

  .shoot {
    width: 68px;
    height: 68px;
    flex: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent);
    color: #fff;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
    transition: transform 0.12s, background 0.15s;
  }
  .shoot:hover { background: var(--accent-deep); }
  .shoot:active { transform: scale(0.92); }

  .dots {
    display: grid;
    grid-template-columns: repeat(25, 1fr);
    gap: 3px;
  }
  .dots span {
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--dot-empty);
    transition: background 0.2s;
  }
  .dots span.on { background: var(--accent); }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    margin-top: 6px;
  }
  .menu-wrap { position: relative; }
  .kebab {
    width: 40px;
    height: 40px;
    margin-left: -10px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--text-secondary);
  }
  .kebab:hover, .kebab[aria-expanded='true'] { background: var(--bg-hover); color: var(--text-primary); }
  /* Opens upward from the card's bottom edge, over the dots. */
  .menu {
    position: absolute;
    left: -10px;
    bottom: calc(100% + 4px);
    z-index: 20;
    min-width: 200px;
    padding: 6px;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  }
  .menu > button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    font-size: 0.92rem;
    text-align: start;
  }
  .menu > button:hover { background: var(--bg-hover); }
  .menu > button :global(svg) { color: var(--text-secondary); }
  /* Delete is a ConfirmButton shaped as the same menu row (it adds the red). */
  .menu :global(.menu-delete) { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 0 12px; border-radius: 10px; font-size: 0.92rem; text-align: start; }
  .menu :global(.menu-delete:hover) { background: var(--bg-hover); }

  .rename { flex: 1; }
  .rename input {
    font-size: 1.05rem;
    font-weight: 500;
    padding: 2px 10px;
    margin: -3px 0 -3px -11px;
    width: calc(100% + 11px);
    border: 1px solid var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
    border-radius: 10px;
    background: var(--bg-surface);
    outline: none;
    -webkit-user-select: text;
    user-select: text;
  }
  .undo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    padding: 10px 4px 10px 12px;
    margin-right: -4px;
    border-radius: 8px;
  }
  .undo:hover { color: var(--accent-deep); }

  /* Small card: one row, under a third of the full card's height. */
  .card.compact { padding: 10px 10px 10px 12px; border-radius: 14px; }
  .row { display: flex; align-items: center; gap: 12px; }
  .compact .count {
    flex: none;
    /* Three digits wide, so every name starts on the same line. */
    width: 3.4rem;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .compact .num { font-size: 1.75rem; transform-origin: center; }
  .compact .label { font-size: 0.68rem; line-height: 1; letter-spacing: 0.03em; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
  .line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .compact h2 { font-size: 0.98rem; line-height: 1.2; }
  .compact .today { font-size: 0.7rem; padding: 1px 8px; }
  .bar { height: 5px; border-radius: 99px; background: var(--dot-empty); overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.2s; }
  .compact .shoot { width: 50px; height: 50px; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 30%, transparent); }
</style>
