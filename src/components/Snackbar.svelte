<script lang="ts">
  import { fly } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { undo } from '../lib/undo.svelte'

  // Focus in the same tap that opened the field, so the phone keyboard opens.
  function focus(node: HTMLInputElement) { node.focus() }
</script>

<div class="wrap" aria-live="polite">
  {#if undo.current}
    {#key undo.current.id}
      <div class="bar" class:editing={undo.editing} transition:fly={{ y: 16, duration: 180 }}>
        {#if undo.editing}
          <form onsubmit={(e) => { e.preventDefault(); undo.saveNote() }}>
            <input
              use:focus
              bind:value={undo.draft}
              placeholder={undo.current.placeholder ?? 'Add a note'}
              maxlength="500"
              enterkeyhint="done"
              aria-label="Note"
              onblur={() => undo.saveNote()}
              onkeydown={(e) => e.key === 'Escape' && undo.cancelNote()}
            />
            <!-- Keep the field's focus on press, so blur doesn't save first. -->
            <button class="save" aria-label="Save note" onpointerdown={(e) => e.preventDefault()}>
              <Icon name="check" size={20} />
            </button>
          </form>
        {:else}
          <span>{undo.current.text}</span>
          {#if undo.current.note}
            <button onclick={() => undo.startNote()}>Note</button>
          {/if}
          <button onclick={() => undo.run()}>Undo</button>
        {/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  .wrap {
    position: fixed;
    inset-inline: 0;
    bottom: calc(var(--safe-bottom) + 16px);
    display: flex;
    justify-content: center;
    padding: 0 12px;
    z-index: 90;
    pointer-events: none;
  }
  .bar {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 2px;
    max-width: 480px;
    width: 100%;
    min-height: 52px;
    padding: 4px 4px 4px 16px;
    border-radius: 14px;
    background: #2c1810;
    color: #faf6f0;
    font-size: 0.88rem;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  }
  :global(.dark) .bar { background: #cdd6f4; color: #1e1e2e; }
  span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px; }
  button { color: var(--accent-light); font-weight: 600; padding: 12px 12px; border-radius: 10px; }
  :global(.dark) button { color: var(--accent-deep); }

  form { flex: 1; display: flex; align-items: center; gap: 4px; }
  input {
    flex: 1;
    min-width: 0;
    font-size: 1rem; /* 16px: iOS doesn't zoom into the field */
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: inherit;
    outline: none;
  }
  input::placeholder { color: inherit; opacity: 0.55; }
  .save {
    width: 44px;
    height: 44px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
  }
  :global(.dark) .save { color: #fff; background: var(--accent-deep); }
</style>
