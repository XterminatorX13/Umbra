<script>
    import { onMount, onDestroy } from "svelte";
    import { perfMonitor } from "../utils/perfMonitor.js";

    export let visible = false;

    let stats = {
        currentFps: 0,
        avgFps: 0,
        minFps: 0,
        totalJanks: 0,
        severeJanks: 0,
        memoryMB: 0,
        scrollEvents: 0,
        rerenders: 0,
    };

    let interval;
    let domNodes = 0;

    function updateStats() {
        stats = perfMonitor.getStats();
        domNodes = document.querySelectorAll("*").length;
    }

    function handleKeydown(e) {
        // Ctrl+Shift+D to toggle
        if (e.ctrlKey && e.shiftKey && e.key === "D") {
            e.preventDefault();
            visible = !visible;
            if (visible) {
                perfMonitor.start();
            } else {
                perfMonitor.stop();
            }
        }
    }

    function runStressTest() {
        console.log("🔥 Starting stress test...");
        perfMonitor.reset();
        perfMonitor.start();

        // Simulate rapid scrolling
        let count = 0;
        const testInterval = setInterval(() => {
            const container = document.querySelector(
                '[style*="overflow-y: auto"]',
            );
            if (container) {
                container.scrollTop = Math.random() * container.scrollHeight;
                perfMonitor.trackScroll();
            }
            count++;
            if (count >= 100) {
                clearInterval(testInterval);
                setTimeout(() => {
                    console.log("🔥 Stress test complete!");
                    perfMonitor.report();
                }, 1000);
            }
        }, 50);
    }

    function checkMemoryLeaks() {
        console.log("🔍 Memory leak check...");
        const initial = performance.memory?.usedJSHeapSize || 0;

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        setTimeout(() => {
            const after = performance.memory?.usedJSHeapSize || 0;
            const diff = (after - initial) / 1024 / 1024;

            if (diff > 5) {
                console.warn(`⚠️ Potential leak: +${diff.toFixed(2)} MB`);
            } else {
                console.log(`✅ Memory stable: ${diff.toFixed(2)} MB change`);
            }
        }, 2000);
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
        interval = setInterval(updateStats, 500);

        if (visible) {
            perfMonitor.start();
        }
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
        clearInterval(interval);
        perfMonitor.stop();
    });
</script>

{#if visible}
    <div class="debug-panel">
        <div class="debug-header">
            📊 Performance Monitor
            <button on:click={() => (visible = false)}>✕</button>
        </div>

        <div class="debug-stats">
            <div
                class="stat"
                class:warning={stats.currentFps < 55}
                class:danger={stats.currentFps < 30}
            >
                <span class="label">FPS</span>
                <span class="value">{stats.currentFps}</span>
                <span class="sub"
                    >avg: {stats.avgFps} | min: {stats.minFps}</span
                >
            </div>

            <div
                class="stat"
                class:warning={stats.memoryMB > 200}
                class:danger={stats.memoryMB > 500}
            >
                <span class="label">Memory</span>
                <span class="value">{stats.memoryMB} MB</span>
            </div>

            <div
                class="stat"
                class:warning={stats.totalJanks > 10}
                class:danger={stats.severeJanks > 5}
            >
                <span class="label">Janks</span>
                <span class="value">{stats.totalJanks}</span>
                <span class="sub">severe: {stats.severeJanks}</span>
            </div>

            <div class="stat">
                <span class="label">DOM Nodes</span>
                <span class="value">{domNodes}</span>
            </div>

            <div class="stat">
                <span class="label">Scroll Events</span>
                <span class="value">{stats.scrollEvents}</span>
            </div>
        </div>

        <div class="debug-actions">
            <button on:click={runStressTest}>🔥 Stress Test</button>
            <button on:click={checkMemoryLeaks}>🔍 Check Leaks</button>
            <button
                on:click={() => {
                    perfMonitor.reset();
                    updateStats();
                }}>🔄 Reset</button
            >
            <button on:click={() => perfMonitor.report()}>📋 Report</button>
        </div>
    </div>
{/if}

<style>
    .debug-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 280px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid var(--highlight, #d96fff);
        border-radius: 8px;
        font-family: "SF Mono", Monaco, monospace;
        font-size: 11px;
        color: #fff;
        z-index: 99999;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-weight: 600;
    }

    .debug-header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 14px;
    }

    .debug-stats {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .stat {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .stat .label {
        width: 80px;
        color: #888;
    }

    .stat .value {
        font-weight: 600;
        color: #4ade80;
    }

    .stat .sub {
        color: #666;
        font-size: 10px;
    }

    .stat.warning .value {
        color: #fbbf24;
    }

    .stat.danger .value {
        color: #ef4444;
    }

    .debug-actions {
        padding: 8px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .debug-actions button {
        flex: 1;
        min-width: calc(50% - 3px);
        padding: 6px 8px;
        font-size: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s;
    }

    .debug-actions button:hover {
        background: rgba(217, 111, 255, 0.3);
        border-color: var(--highlight, #d96fff);
    }
</style>
