/* Per-file patches from the unified diff of a pull request.
 *
 * The GitHub "list pull request files" API leaves `patch` out for a file
 * with a large diff. The diff of the full pull request has those hunks.
 * Each patch here has the same form as the API `patch` field: it starts at
 * the first `@@` line and has no file header.
 */

/* Map of new filename -> patch. A file with no hunks (binary, pure rename)
 * has no entry. */
export function splitDiff(diff: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const section of diff.split(/^(?=diff --git )/m)) {
        if (!section.startsWith("diff --git "))
            continue;
        const hunkAt = section.search(/^@@ /m);
        if (hunkAt < 0)
            continue;
        const header = section.slice(0, hunkAt);
        // "+++ b/<name>" is the new name; a removed file has "+++ /dev/null".
        const name = header.match(/^\+\+\+ b\/(.+?)\t?$/m)?.[1] ?? header.match(/^--- a\/(.+?)\t?$/m)?.[1];
        if (!name)
            continue;
        out.set(name, section.slice(hunkAt).replace(/\n$/, ""));
    }
    return out;
}
