function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
export type DiffLine = {
    type: "add" | "del" | "hunk" | "ctx" | "meta";
    oldNo: number | null;
    newNo: number | null;
    text: string;
};
export function parseDiff(patch: string): DiffLine[] {
    const out: DiffLine[] = [];
    let oldNo = 0;
    let newNo = 0;
    for (const line of patch.split("\n")) {
        if (line.startsWith("@@")) {
            const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (m) {
                oldNo = Number(m[1]);
                newNo = Number(m[2]);
            }
            out.push({ type: "hunk", oldNo: null, newNo: null, text: line });
        }
        else if (line.startsWith("+")) {
            out.push({ type: "add", oldNo: null, newNo, text: line });
            newNo++;
        }
        else if (line.startsWith("-")) {
            out.push({ type: "del", oldNo, newNo: null, text: line });
            oldNo++;
        }
        else if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
            out.push({ type: "meta", oldNo: null, newNo: null, text: line });
        }
        else {
            out.push({ type: "ctx", oldNo, newNo, text: line });
            oldNo++;
            newNo++;
        }
    }
    return out;
}
export function diffToHtml(patch: string): string {
    return parseDiff(patch)
        .map((l) => `<span class="diff-line diff-${l.type}">${esc(l.text)}</span>`)
        .join("\n");
}
