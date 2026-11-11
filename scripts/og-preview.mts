// Starts the dev server and opens /og-preview.html, which reads each
// route's head the way a crawler does and checks the link previews before a
// deploy. Ctrl-C stops the server.
import { spawn } from "node:child_process";
import { platform } from "node:os";

const port = Number(process.argv[2] ?? 3001);
const url = `http://localhost:${port}/og-preview.html`;
const dev = spawn("pnpm", ["exec", "next", "dev", "-p", String(port)], { stdio: "inherit" });

const deadline = Date.now() + 90_000;
let up = false;
while (Date.now() < deadline && !up) {
    await new Promise((done) => setTimeout(done, 500));
    up = await fetch(`http://127.0.0.1:${port}/og-preview.html`)
        .then((r) => r.ok)
        .catch(() => false);
}
if (!up) {
    console.error(`dev server did not come up on port ${port}`);
    dev.kill("SIGTERM");
    process.exit(1);
}

const opener = platform() === "darwin" ? "open" : "xdg-open";
spawn(opener, [url], { stdio: "ignore" }).unref();
console.log(`link previews: ${url}`);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
        dev.kill(sig);
        process.exit(0);
    });
}
