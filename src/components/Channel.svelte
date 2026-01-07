<script lang="ts">
  export let name: string = "";
  export let active: boolean = false;
  export let type: 'text' | 'announcement' = 'text';
</script>

<button
  class="channel {active ? 'active' : ''}"
  aria-label={name}
>
  <span class="icon">#</span>
  <span class="name">{name}</span>
</button>

<style>
  .channel {
    width: 100%;
    height: 36px;
    background: transparent;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    cursor: pointer;
    color: #949ba4;
    transition: background 0.15s, color 0.15s;
    margin: 2px 0;
    outline: none;
  }

  .channel:hover {
    background: #35373c;
    color: #dbdee1;
  }

  .channel.active {
    background: #404249;
    color: #ffffff;
  }

  .icon {
    font-size: 1.25rem;
    font-weight: 400;
    flex-shrink: 0;
  }

  .name {
    font-size: 0.9375rem;
    font-weight: 500;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

