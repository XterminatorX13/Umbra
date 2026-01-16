import { writable } from "svelte/store";

export const toasts = writable([]);

export function addToast(message, type = "info") {
    const id = Math.random().toString(36).substring(2);
    toasts.update((t) => [...t, { id, message, type }]);

    // Auto remove happens in Toast.svelte or here
    // Toast.svelte already has auto-remove logic, so we just push here.
}
