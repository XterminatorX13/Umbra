/**
 * Performance Monitor - Benchmark & Diagnostics
 * 
 * Features:
 * - FPS Counter (real-time)
 * - Memory Tracker (heap size)
 * - Scroll Jank Detector (frames > 16ms)
 * - Render Time Measurement
 */

class PerfMonitor {
    constructor() {
        this.fps = 0;
        this.frames = 0;
        this.lastTime = performance.now();
        this.isRunning = false;
        this.rafId = null;

        // Metrics storage
        this.metrics = {
            fpsHistory: [],
            memoryHistory: [],
            janks: [],
            scrollEvents: 0,
            rerenders: 0
        };

        // Jank detection
        this.lastFrameTime = 0;
        this.jankThreshold = 16.67; // 60fps = 16.67ms per frame
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.frames = 0;
        this.tick();
        console.log('📊 PerfMonitor started');
    }

    stop() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        console.log('📊 PerfMonitor stopped');
    }

    tick() {
        if (!this.isRunning) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;

        // Detect janks (frames taking longer than 16.67ms)
        if (this.lastFrameTime > 0 && delta > this.jankThreshold * 1.5) {
            this.metrics.janks.push({
                time: now,
                duration: delta,
                severity: delta > 50 ? 'severe' : 'mild'
            });
        }
        this.lastFrameTime = now;

        this.frames++;

        // Calculate FPS every second
        if (now - this.lastTime >= 1000) {
            this.fps = this.frames;
            this.metrics.fpsHistory.push({
                time: now,
                fps: this.fps
            });

            // Memory tracking (if available)
            if (performance.memory) {
                this.metrics.memoryHistory.push({
                    time: now,
                    usedHeap: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    totalHeap: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                });
            }

            this.frames = 0;
            this.lastTime = now;
        }

        this.rafId = requestAnimationFrame(() => this.tick());
    }

    // Get current stats
    getStats() {
        const lastMemory = this.metrics.memoryHistory[this.metrics.memoryHistory.length - 1];
        const avgFps = this.metrics.fpsHistory.length > 0
            ? Math.round(this.metrics.fpsHistory.reduce((a, b) => a + b.fps, 0) / this.metrics.fpsHistory.length)
            : 0;
        const minFps = this.metrics.fpsHistory.length > 0
            ? Math.min(...this.metrics.fpsHistory.map(m => m.fps))
            : 0;

        return {
            currentFps: this.fps,
            avgFps,
            minFps,
            totalJanks: this.metrics.janks.length,
            severeJanks: this.metrics.janks.filter(j => j.severity === 'severe').length,
            memoryMB: lastMemory?.usedHeap || 0,
            scrollEvents: this.metrics.scrollEvents,
            rerenders: this.metrics.rerenders
        };
    }

    // Track scroll events
    trackScroll() {
        this.metrics.scrollEvents++;
    }

    // Track re-renders
    trackRerender() {
        this.metrics.rerenders++;
    }

    // Full report
    report() {
        const stats = this.getStats();
        console.log('\n📊 === PERFORMANCE REPORT ===\n');
        console.log(`🎯 FPS: ${stats.currentFps} (avg: ${stats.avgFps}, min: ${stats.minFps})`);
        console.log(`💾 Memory: ${stats.memoryMB} MB`);
        console.log(`⚠️ Janks: ${stats.totalJanks} (severe: ${stats.severeJanks})`);
        console.log(`📜 Scroll Events: ${stats.scrollEvents}`);
        console.log(`🔄 Re-renders: ${stats.rerenders}`);

        if (stats.avgFps < 55) {
            console.warn('⚠️ FPS below 55 - consider optimizations');
        }
        if (stats.severeJanks > 5) {
            console.warn('⚠️ Multiple severe janks detected');
        }

        return stats;
    }

    // Reset all metrics
    reset() {
        this.metrics = {
            fpsHistory: [],
            memoryHistory: [],
            janks: [],
            scrollEvents: 0,
            rerenders: 0
        };
        console.log('📊 Metrics reset');
    }
}

// Singleton instance
export const perfMonitor = new PerfMonitor();

// Auto-start in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    window.perfMonitor = perfMonitor;
    console.log('💡 PerfMonitor available as window.perfMonitor');
    console.log('   Commands: .start() .stop() .report() .reset()');
}

export default PerfMonitor;
