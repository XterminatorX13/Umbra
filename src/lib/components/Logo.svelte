<script>
    export let size = 80;
</script>

<!-- Dark Aurora Eclipse Logo - Exact Reference Match -->
<div class="logo-wrapper" style="--size: {size}px">
    <!-- Outer Purple Glow (Soft Bloom) -->
    <div class="outer-glow"></div>

    <!-- Eclipse Rim (Continuous Purple Ring) -->
    <div class="eclipse-rim"></div>

    <!-- The Black Void Core -->
    <div class="void-core">
        <!-- Top Reflection/Highlight -->
        <div class="top-reflection"></div>

        <!-- The Lambda Symbol -->
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="lambda-svg"
        >
            <defs>
                <!-- White to Silver Gradient -->
                <linearGradient
                    id="lambda-gradient"
                    x1="50%"
                    y1="0%"
                    x2="50%"
                    y2="100%"
                >
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="60%" stop-color="#E5E7EB" />
                    <stop offset="100%" stop-color="#9CA3AF" />
                </linearGradient>
            </defs>

            <!-- Lambda Path - Sharp & Clean -->
            <path
                d="M28 80 L50 18 L72 80"
                stroke="url(#lambda-gradient)"
                stroke-width="10"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    </div>
</div>

<style>
    .logo-wrapper {
        position: relative;
        width: var(--size);
        height: var(--size);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* 1. Soft Purple Bloom (Outermost layer) */
    .outer-glow {
        position: absolute;
        inset: -20%;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.3) 0%,
            rgba(139, 92, 246, 0.15) 40%,
            rgba(139, 92, 246, 0.05) 60%,
            transparent 80%
        );
        pointer-events: none;
        animation: pulse-glow 4s ease-in-out infinite;
    }

    /* 2. Eclipse Rim (Purple/White Ring) */
    .eclipse-rim {
        position: absolute;
        inset: 0;
        border-radius: 50%;

        /* Continuous gradient ring */
        background: conic-gradient(
            from 270deg,
            rgba(168, 85, 247, 0.9) 0%,
            rgba(192, 132, 252, 0.7) 25%,
            rgba(139, 92, 246, 0.5) 50%,
            rgba(192, 132, 252, 0.7) 75%,
            rgba(168, 85, 247, 0.9) 100%
        );

        /* Mask to create ring shape */
        -webkit-mask: radial-gradient(
            circle,
            transparent 70%,
            black 71%,
            black 100%
        );
        mask: radial-gradient(circle, transparent 70%, black 71%, black 100%);

        /* Glow effect */
        filter: blur(2px);
        opacity: 0.9;

        /* Slow rotation */
        animation: rotate-rim 12s linear infinite;
    }

    /* 3. Black Void Core */
    .void-core {
        position: relative;
        width: 75%;
        height: 75%;
        border-radius: 50%;
        background: #000000;

        display: flex;
        align-items: center;
        justify-content: center;

        /* Subtle inner shadow for depth */
        box-shadow:
            inset 0 0 20px rgba(0, 0, 0, 1),
            0 0 30px rgba(139, 92, 246, 0.3);

        z-index: 2;
        overflow: hidden;
    }

    /* 4. Top Reflection (Oval highlight) */
    .top-reflection {
        position: absolute;
        top: 8%;
        left: 50%;
        transform: translateX(-50%);
        width: 40%;
        height: 8%;
        background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.15) 0%,
            transparent 70%
        );
        border-radius: 50%;
        filter: blur(2px);
    }

    /* 5. Lambda SVG */
    .lambda-svg {
        width: 55%;
        height: 55%;
        z-index: 3;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
    }

    /* Animations */
    @keyframes rotate-rim {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes pulse-glow {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(1);
        }
        50% {
            opacity: 1;
            transform: scale(1.05);
        }
    }
</style>
