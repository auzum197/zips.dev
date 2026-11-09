/** One entry of a ZIP header status, e.g. "[Revision 2: NU7] Proposed". */
export interface StatusEntry {
    status: string;
    /** Revisions this entry covers, with the network upgrade each one ships in (if any). */
    revisions: {
        number: number;
        upgrade: string | null;
    }[];
}
/**
 * Split a ZIP header status into per-revision entries.
 *
 *   "Final"                                          → [{ Final, [] }]
 *   "[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed"
 *     → [{ Final, [0 Canopy, 1 NU6] }, { Proposed, [2 NU7] }]
 *
 * A status without brackets is one entry, also if it contains commas. If the
 * text does not match the list form, it is returned as one entry, unchanged.
 */
export function parseStatus(text: string): StatusEntry[] {
    const whole = [{ status: text.trim(), revisions: [] }];
    if (!text.includes("["))
        return whole;
    const entries: StatusEntry[] = [];
    const clause = /\s*\[([^\]]*)\]\s*([^,[\]]+?)\s*(?:,|$)/y;
    let m: RegExpExecArray | null;
    while (clause.lastIndex < text.length && (m = clause.exec(text))) {
        const revisions = [];
        for (const part of m[1].split(",")) {
            const r = part.trim().match(/^Revision\s+(\d+)(?:\s*:\s*(.+))?$/i);
            if (!r)
                return whole;
            revisions.push({ number: Number(r[1]), upgrade: r[2]?.trim() || null });
        }
        entries.push({ status: m[2], revisions });
    }
    return entries.length > 0 && clause.lastIndex >= text.length ? entries : whole;
}
/** Merge entries with the same status, in order of first appearance: "Proposed" r2 and "Proposed" r3 become one group. */
export function groupByStatus(entries: StatusEntry[]): StatusEntry[] {
    const groups = new Map<string, StatusEntry>();
    for (const e of entries) {
        const g = groups.get(e.status);
        if (g)
            g.revisions.push(...e.revisions);
        else
            groups.set(e.status, { status: e.status, revisions: [...e.revisions] });
    }
    return [...groups.values()];
}
/** True when the status lists several revisions; each entry then shows its own revision, so a separate "rN" badge repeats it. */
export function isRevisionList(text: string): boolean {
    return parseStatus(text).length > 1;
}
