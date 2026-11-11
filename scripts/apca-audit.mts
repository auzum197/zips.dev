const Rco = 0.2126729, Gco = 0.7151522, Bco = 0.072175;
const normBG = 0.56, normTXT = 0.57, revTXT = 0.62, revBG = 0.65;
const blkThrs = 0.022, blkClmp = 1.414, scaleBoW = 1.14, scaleWoB = 1.14;
const deltaYmin = 0.0005, loClip = 0.1;
const hex2rgb = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
];
function Ys(hex: string): number {
    const [r, g, b] = hex2rgb(hex).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return Rco * r + Gco * g + Bco * b;
}
const fclamp = (Y: number): number => (Y >= blkThrs ? Y : Y + Math.pow(blkThrs - Y, blkClmp));
export function apca(txtHex: string, bgHex: string): number {
    const Ytxt = fclamp(Ys(txtHex));
    const Ybg = fclamp(Ys(bgHex));
    const D = Ybg - Ytxt;
    if (Math.abs(D) < deltaYmin)
        return 0;
    let out;
    if (D > 0) {
        out = (Math.pow(Ybg, normBG) - Math.pow(Ytxt, normTXT)) * scaleBoW;
    }
    else {
        out = (Math.pow(Ybg, revBG) - Math.pow(Ytxt, revTXT)) * scaleWoB;
    }
    if (Math.abs(out) < loClip)
        return 0;
    return Math.round(out * 100);
}
interface Theme {
    bg: string; mutedBg: string; codeBg: string;
    fg: string; muted: string; faint: string;
    accent: string; accentSoft: string;
    success: string; successSoft: string;
    warn: string; warnSoft: string;
    destructive: string; dangerSoft: string;
    purple: string; purpleSoft: string;
    border: string; accentFg: string;
}
const THEMES: Record<"light" | "dark", Theme> = {
    light: {
        bg: "#ffffff", mutedBg: "#f6f8fa", codeBg: "#f6f8fa",
        fg: "#1f2328", muted: "#586069", faint: "#626b75",
        accent: "#0050c1", accentSoft: "#ddf4ff",
        success: "#036820", successSoft: "#dafbe1",
        warn: "#865300", warnSoft: "#fff8c5",
        destructive: "#b0030f", dangerSoft: "#ffebe9",
        purple: "#6b39c8", purpleSoft: "#fbefff",
        border: "#c3cad1", accentFg: "#ffffff",
    },
    dark: {
        bg: "#0d1117", mutedBg: "#161b22", codeBg: "#161b22",
        fg: "#e6edf3", muted: "#c3ccd6", faint: "#c0c8d3",
        accent: "#86d5ff", accentSoft: "#121d2f",
        success: "#6de77e", successSoft: "#12261e",
        warn: "#fbc24b", warnSoft: "#241c10",
        destructive: "#ffbab2", dangerSoft: "#25171c",
        purple: "#e8baff", purpleSoft: "#1f1a2e",
        border: "#6e7681", accentFg: "#1c1c1c",
    },
};
function rgb2hex([r, g, b]: [number, number, number]): string {
    return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function shiftL(hex: string, dl: number): string {
    const [r, g, b] = hex2rgb(hex).map((c) => Math.min(255, Math.max(0, c + dl * 255)));
    return rgb2hex([r, g, b]);
}
function solve(fg: string, bg: string, min: number, dir?: number): string | null {
    const start = Math.abs(apca(fg, bg));
    if (start >= min)
        return fg;
    const d = dir ?? (apca(fg, bg) > 0 ? -1 : 1);
    for (let dl = 0.01; dl <= 0.9; dl += 0.01) {
        const cand = shiftL(fg, d * dl);
        if (Math.abs(apca(cand, bg)) >= min)
            return cand;
    }
    return null;
}
type Task = [theme: "light" | "dark", key: keyof Theme, bgKey: keyof Theme, min: number, dir: number];
const TASKS: Task[] = [
    ["light", "muted", "mutedBg", 76, -1],
    ["light", "faint", "bg", 76, -1],
    ["light", "accent", "accentSoft", 76, -1],
    ["light", "success", "successSoft", 76, -1],
    ["light", "success", "bg", 76, -1],
    ["light", "warn", "warnSoft", 76, -1],
    ["light", "destructive", "dangerSoft", 76, -1],
    ["light", "purple", "purpleSoft", 76, -1],
    ["light", "purple", "bg", 76, -1],
    ["light", "border", "bg", 30, -1],
    ["dark", "muted", "mutedBg", 76, 1],
    ["dark", "faint", "bg", 76, 1],
    ["dark", "accent", "accentSoft", 76, 1],
    ["dark", "accentFg", "accent", 76, -1],
    ["dark", "success", "successSoft", 76, 1],
    ["dark", "success", "bg", 76, 1],
    ["dark", "warn", "warnSoft", 76, 1],
    ["dark", "destructive", "dangerSoft", 76, 1],
    ["dark", "purple", "purpleSoft", 76, 1],
    ["dark", "purple", "bg", 76, 1],
];
console.log("\n=== solver (minimal L shift to pass) ===");
for (const [theme, key, bgKey, min, dir] of TASKS) {
    const t = THEMES[theme];
    const before = Math.abs(apca(t[key], t[bgKey]));
    const solved = solve(t[key], t[bgKey], min, dir);
    const after = solved ? Math.abs(apca(solved, t[bgKey])) : 0;
    console.log(`${theme} ${key.padEnd(12)} vs ${bgKey.padEnd(11)} ${t[key]} → ${solved}  Lc ${before}→${after} (min ${min})`);
    THEMES[theme][key] = solved ?? t[key];
}
function audit(themeName: string, t: Theme): number {
    const pairs: Array<[name: string, fg: string, bg: string, min: number]> = [
        ["body text", t.fg, t.bg, 90],
        ["body on code bg", t.fg, t.codeBg, 90],
        ["muted text (meta, dd, subtitles)", t.muted, t.bg, 75],
        ["muted on muted bg (badges secondary)", t.muted, t.mutedBg, 75],
        ["faint (labels, dates, ToC l3)", t.faint, t.bg, 75],
        ["accent link text", t.accent, t.bg, 75],
        ["accent on accent-soft (chips)", t.accent, t.accentSoft, 75],
        ["accentFg on accent (buttons)", t.accentFg, t.accent, 75],
        ["success badge text", t.success, t.successSoft, 75],
        ["success on bg", t.success, t.bg, 75],
        ["warn badge text", t.warn, t.warnSoft, 75],
        ["destructive badge text", t.destructive, t.dangerSoft, 75],
        ["purple badge text", t.purple, t.purpleSoft, 75],
        ["purple on bg", t.purple, t.bg, 75],
        ["input border (non-text)", t.border, t.bg, 30],
    ];
    console.log(`\n=== ${themeName} (solved) ===`);
    let fail = 0;
    for (const [name, fg, bg, min] of pairs) {
        const lc = Math.abs(apca(fg, bg));
        const ok = lc >= min;
        if (!ok)
            fail++;
        console.log(`${ok ? " PASS" : "FAIL"}  Lc ${String(lc).padStart(3)} (min ${min})  ${name}  ${fg} on ${bg}`);
    }
    return fail;
}
let total = 0;
total += audit("light", THEMES.light);
total += audit("dark", THEMES.dark);
console.log(`\n${total} failures`);
process.exit(total ? 1 : 0);
