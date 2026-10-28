<script lang="ts">
  import Icon from './Icon.svelte'
  import { habits, shotLabel, shotsToday, TARGET, type Habit } from '../lib/habits.svelte'
  import { undo } from '../lib/undo.svelte'
  import { router } from '../lib/router.svelte'

  let { habit, compact = false }: { habit: Habit; compact?: boolean } = $props()

  const n = $derived(habit.shots.length)
  // The big number is the shot you're about to take: 100 before the first.
  const next = $derived(shotLabel(n))
  const done = $derived(n >= TARGET)
  const today = $derived(shotsToday(habit))
  const progress = $derived(Math.min(n, TARGET) / TARGET)
  let pop = $state(0)
  let lastTap = 0

  function shoot(e: MouseEvent) {
    e.stopPropagation()
    // A double tap is almost always a bounce, not two attempts.
    const now = Date.now()
    if (now - lastTap < 700) return
    lastTap = now
    const label = shotLabel(n)
    const s = habits.shoot(habit.id)
    if (!s) return
    pop++
    navigator.vibrate?.(12)
    undo.offer(`${habit.name}: shot ${label} logged`, () => habits.removeShot(habit.id, s.id))
  }

  function undoLast(e: MouseEvent) {
    e.stopPropagation()
    const r = habits.undoLast(habit.id)
    if (r) undo.offer(`Shot ${shotLabel(r.index)} removed`, () => habits.restoreShot(habit.id, r.shot))
  }
</script>

<article class="card" class:done class:compact>
  <button class="open" onclick={() => router.go(`/h/${habit.id}`)} aria-label="Open {habit.name}"></button>

  {#if compact}
    <!-- Compact: the number, the name, a thin progress bar and the button.
         The 100 dots become the bar; the label, the "n of 100" line and the
         card's Undo go (the snackbar still offers undo after every shot). -->
    <div class="row">
      {#key pop}<span class="num" class:popped={pop > 0}>{next}</span>{/key}
      <div class="info">
        <div class="line">
          <h2>{habit.name}</h2>
          {#if today}<span class="today">{today} today</span>{/if}
        </div>
        <span class="bar" aria-hidden="true"><span style="width: {progress * 100}%"></span></span>
      </div>
      <button class="shoot" data-no-drag onclick={shoot} aria-label="Log shot {next}">
        <Icon name="check" size={30} />
      </button>
    </div>
  {:else}
    <header>
      <h2>{habit.name}</h2>
      {#if today}<span class="today">{today} today</span>{/if}
    </header>

    <div class="main">
      <div class="count">
        {#key pop}<span class="num" class:popped={pop > 0}>{next}</span>{/key}
        <span class="label">
          {#if n === 0}first shot
          {:else if n < TARGET}{TARGET - n === 1 ? 'last bad shot' : 'next shot'}
          {:else if n === TARGET}100 bad shots, done
          {:else}past 100{/if}
        </span>
      </div>
      <button class="shoot" data-no-drag onclick={shoot} aria-label="Log shot {next}">
        <Icon name="check" size={40} />
      </button>
    </div>

    <div class="dots" aria-hidden="true">
      {#each { length: TARGET } as _, i}
        <span class:on={i < n}></span>
      {/each}
    </div>

    <footer>
      <span class="meta">{n} of {TARGET}{n > TARGET ? ` (+${n - TARGET})` : ''}</span>
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
  .shoot, .undo { pointer-events: auto; }

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
  .count { display: flex; flex-direction: column; }
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
  .label { font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px; letter-spacing: 0.02em; }
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
  .meta { font-size: 0.75rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
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

  /* Compact: one row, about a third of the full card's height. */
  .card.compact { padding: 10px 10px 10px 14px; border-radius: 14px; }
  .row { display: flex; align-items: center; gap: 12px; }
  .compact .num {
    flex: none;
    /* Three digits wide, so every name starts on the same line. */
    min-width: 3ch;
    font-size: 1.85rem;
    transform-origin: center;
    text-align: center;
  }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
  .line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .compact h2 { font-size: 0.98rem; line-height: 1.2; }
  .bar {
    height: 5px;
    border-radius: 99px;
    background: var(--dot-empty);
    overflow: hidden;
  }
  .bar span { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width 0.2s; }
  .compact .today { font-size: 0.7rem; padding: 1px 8px; }
  .compact .shoot { width: 50px; height: 50px; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 30%, transparent); }
</style>
