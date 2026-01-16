import { writable } from "svelte/store";

export const toasts = writable([]);

export function addToast(messageOrOptions, type = "info") {
    const id = Math.random().toString(36).substring(2);

    // Support both: addToast("msg", "type") and addToast({ message, type, duration })
    let message, toastType, duration;
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
        message = messageOrOptions.message;
        toastType = messageOrOptions.type || "info";
        duration = messageOrOptions.duration || 3000;
    } else {
        message = messageOrOptions;
        toastType = type;
        duration = 3000;
    }

    toasts.update((t) => [...t, { id, message, type: toastType, duration }]);

    // Auto-remove after duration
    setTimeout(() => {
        toasts.update((t) => t.filter((toast) => toast.id !== id));
    }, duration);
}
