import { useSyncExternalStore } from "react";

/* Open state of the command palette. It is a module store, not React
 * context: any control can open the palette with one call. */
type State = {
    open: boolean;
    /** Opened from the keyboard: no entry motion. */
    instant: boolean;
};
const CLOSED: State = { open: false, instant: false };
let state = CLOSED;
const listeners = new Set<() => void>();

function set(next: State) {
    state = next;
    listeners.forEach((fn) => fn());
}

export function openCommandPalette(options?: { instant?: boolean }) {
    set({ open: true, instant: options?.instant ?? false });
}

export function closeCommandPalette() {
    if (state.open)
        set(CLOSED);
}

function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function useCommandPalette(): State {
    return useSyncExternalStore(subscribe, () => state, () => CLOSED);
}
