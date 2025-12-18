import { spawn } from "bun";

console.log("🚀 Starting Development Environment (Bun-native)...");

// 1. Start Vite
const vite = spawn([process.execPath, "run", "vite"], {
    stdout: "inherit",
    stderr: "inherit",
});

console.log("📡 Waiting for Vite (http://localhost:5173)...");

// 2. Wait for port 5173 to be ready
async function waitForVite() {
    while (true) {
        try {
            const response = await fetch("http://localhost:5173");
            if (response.status === 200) {
                console.log("✅ Vite is ready!");
                break;
            }
        } catch (e) {
            // Not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}

await waitForVite();

// 3. Start Electron
console.log("💻 Launching Electron...");
const electron = spawn([process.execPath, "run", "electron", "."], {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
});

// Handle child process exits
vite.exited.then((code) => {
    console.log(`Vite exited with code ${code}`);
    electron.kill();
    process.exit(code);
});

electron.exited.then((code) => {
    console.log(`Electron exited with code ${code}`);
    vite.kill();
    process.exit(code);
});
