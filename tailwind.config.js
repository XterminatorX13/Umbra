/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            colors: {
                // Custom colors from the original design
                'app-bg': '#020617',
                'app-border': '#111827',
                'app-input': '#1f2937',
                'app-text': '#e5e7eb',
                'app-text-muted': '#9ca3af',
            }
        },
    },
    plugins: [],
}
