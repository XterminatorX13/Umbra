/**
 * Debounce/Throttle Utilities
 * Baseado no ARQUIVO.HTML mobile-first
 * 
 * Otimizado para diferentes casos de uso
 */

/**
 * Debounce - Espera o usuário parar de digitar
 * Ideal para busca e inputs
 */
export function debounce(fn, delay) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle - Limita execução a X vezes por segundo
 * Ideal para scroll, resize, drag
 */
export function throttle(fn, limit) {
    let inThrottle;

    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Debounce com RAF - Combina debounce com requestAnimationFrame
 * Perfeito para atualizações visuais após input
 */
export function debounceRAF(fn, delay) {
    let timeoutId;
    let rafId;

    return function (...args) {
        clearTimeout(timeoutId);
        if (rafId) cancelAnimationFrame(rafId);

        timeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(() => fn.apply(this, args));
        }, delay);
    };
}

/**
 * Search Debounce Inteligente
 * Delay automático baseado no modo de busca
 */
export function createSearchDebounce() {
    let titleTimeout;
    let deepTimeout;

    return {
        title(fn) {
            clearTimeout(titleTimeout);
            titleTimeout = setTimeout(fn, 150); // Rápido para title search
        },

        deep(fn) {
            clearTimeout(deepTimeout);
            deepTimeout = setTimeout(fn, 400); // Mais lento para deep search
        },

        cancel() {
            clearTimeout(titleTimeout);
            clearTimeout(deepTimeout);
        }
    };
}
