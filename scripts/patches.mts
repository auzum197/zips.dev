/* Per-file patches from a pull request diff, in the form of the GitHub API `patch` field. */
export function splitDiff(diff: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const section of diff.split(/^(?=diff --git )/m)) {
        if (!section.startsWith("diff --git "))
            continue;
        const hunkAt = section.search(/^@@ /m);
        if (hunkAt < 0)
            continue;
        const header = section.slice(0, hunkAt);
        const name = header.match(/^\+\+\+ b\/(.+?)\t?$/m)?.[1] ?? header.match(/^--- a\/(.+?)\t?$/m)?.[1];
        if (!name)
            continue;
        out.set(name, section.slice(hunkAt).replace(/\n$/, ""));
    }
    return out;
}
