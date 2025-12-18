/**
 * Virtual Scrolling Utility
 * Baseado nas otimizações do ARQUIVO.HTML mobile-first
 * 
 * Renderiza apenas itens visíveis + buffer para performance máxima
 */

export class VirtualScroller {
    constructor(config) {
        this.itemHeight = config.itemHeight || 80;
        this.bufferSize = config.bufferSize || 5;
        this.container = null;
        this.items = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTicking = false;
    }

    /**
     * Calcula quais itens devem estar visíveis
     */
    calculateVisibleRange(scrollTop, containerHeight) {
        const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
        const visibleCount = Math.ceil(containerHeight / this.itemHeight);
        const end = Math.min(this.items.length, start + visibleCount + (this.bufferSize * 2));

        return { start, end };
    }

    /**
     * Retorna apenas os itens que devem ser renderizados
     */
    getVisibleItems(scrollTop, containerHeight) {
        const range = this.calculateVisibleRange(scrollTop, containerHeight);

        // Só atualiza se mudou significativamente
        if (range.start === this.visibleRange.start && range.end === this.visibleRange.end) {
            return null; // Sem mudanças
        }

        this.visibleRange = range;

        return {
            items: this.items.slice(range.start, range.end),
            startIndex: range.start,
            endIndex: range.end,
            totalHeight: this.items.length * this.itemHeight,
            offsetY: range.start * this.itemHeight
        };
    }

    /**
     * Handler de scroll otimizado com RAF
     */
    handleScroll(scrollTop, containerHeight, callback) {
        if (!this.scrollTicking) {
            window.requestAnimationFrame(() => {
                const result = this.getVisibleItems(scrollTop, containerHeight);
                if (result) {
                    callback(result);
                }
                this.scrollTicking = false;
            });
            this.scrollTicking = true;
        }
    }

    /**
     * Atualiza a lista de itens
     */
    setItems(items) {
        this.items = items;
        this.visibleRange = { start: 0, end: 0 };
    }

    /**
     * Retorna a altura total do conteúdo virtual
     */
    getTotalHeight() {
        return this.items.length * this.itemHeight;
    }
}

/**
 * Hook Svelte para usar Virtual Scrolling
 */
export function createVirtualScroll(itemHeight = 80, bufferSize = 5) {
    const scroller = new VirtualScroller({ itemHeight, bufferSize });

    return {
        scroller,

        /**
         * Use em onMount para configurar o listener
         */
        setupScrollListener(container, callback) {
            const handleScroll = () => {
                scroller.handleScroll(
                    container.scrollTop,
                    container.clientHeight,
                    callback
                );
            };

            container.addEventListener('scroll', handleScroll, { passive: true });

            // Render inicial
            handleScroll();

            // Cleanup
            return () => {
                container.removeEventListener('scroll', handleScroll);
            };
        },

        /**
         * Atualiza itens e força re-render
         */
        updateItems(items, container, callback) {
            scroller.setItems(items);
            if (container) {
                const result = scroller.getVisibleItems(
                    container.scrollTop,
                    container.clientHeight
                );
                if (result) callback(result);
            }
        }
    };
}
