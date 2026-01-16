import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number | null): string {
    if (!timestamp) return "";
    const ms = timestamp < 2000000000 ? timestamp * 1000 : timestamp;
    return new Date(ms).toLocaleDateString();
}

export function formatDateTime(timestamp: number | null): string {
    if (!timestamp) return "";
    const ms = timestamp < 2000000000 ? timestamp * 1000 : timestamp;
    return new Date(ms).toLocaleString();
}
