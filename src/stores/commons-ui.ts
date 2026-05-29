import { writable } from 'svelte/store';

/** Set true to open the personal broadcast modal from the sidebar (+) control. */
export const commonsBroadcastModalOpen = writable(false);

export function openCommonsBroadcastModal(): void {
  commonsBroadcastModalOpen.set(true);
}
