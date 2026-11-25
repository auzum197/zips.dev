const NAME = "github-pages";
const CHECKS = 24;
const INTERVAL_MS = 5000;
const FALLBACK_MS = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const warn = (message) => console.log(`::warning::${message}`);

async function listed(url, token, run, job, wanted) {
    const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ workflow_run_backend_id: run, workflow_job_run_backend_id: job }),
    });
    if (!res.ok)
        throw new Error(`ListArtifacts HTTP ${res.status}`);
    const named = ((await res.json()).artifacts ?? []).filter((a) => a.name === NAME);
    const id = named[0]?.database_id ?? named[0]?.databaseId;
    return { count: named.length, ok: named.length === 1 && (id === undefined || !wanted || String(id) === wanted) };
}

async function main() {
    const token = process.env.ACTIONS_RUNTIME_TOKEN;
    const wanted = process.env.INPUT_ARTIFACT_ID;
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const [, run, job] = claims.scp.split(" ").find((s) => s.startsWith("Actions.Results:")).split(":");
    const url = `${new URL(process.env.ACTIONS_RESULTS_URL).origin}/twirp/github.actions.results.api.v1.ArtifactService/ListArtifacts`;
    for (let i = 1; i <= CHECKS; i++) {
        const { count, ok } = await listed(url, token, run, job, wanted);
        if (ok) {
            console.log(`the artifact is in the list (check ${i})`);
            return;
        }
        console.log(`check ${i}: ${count} artifact(s) named "${NAME}"; waiting ${INTERVAL_MS / 1000} s`);
        await sleep(INTERVAL_MS);
    }
    warn(`the artifact is not in the list after ${(CHECKS * INTERVAL_MS) / 60000} min; deploying anyway`);
}

try {
    await main();
}
catch (err) {
    warn(`could not read the artifact list (${err.message}); waiting ${FALLBACK_MS / 1000} s`);
    await sleep(FALLBACK_MS);
}
