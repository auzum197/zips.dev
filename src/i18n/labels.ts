import { useTranslations } from "next-intl";
/* Text that comes from data, not from the interface: ZIP statuses and
 * categories (zcash/zips headers), upgrade summaries, implementation notes
 * and source notes (data/*.yaml).
 *
 * A language translates these under "Data" in its messages file. A value
 * with no translation is shown as it is in the data, so new data never
 * breaks a page. English has no "Data" entries for this reason.
 */
type Translator = {
    (key: string): string;
    has: (key: string) => boolean;
};
const slug = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
export function labels(t: Translator) {
    const pick = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
        /** "Draft" → "Borrador" */
        status: (value: string) => pick(`status.${slug(value)}`, value),
        /** "Consensus / Wallet" → "Consenso / Billetera" */
        category: (value: string) => value.split(" / ").map((part) => pick(`category.${slug(part)}`, part)).join(" / "),
        upgradeSummary: (id: string, fallback: string) => pick(`upgrade.${slug(id)}`, fallback),
        implNotes: (name: string, fallback: string) => pick(`impl.${slug(name)}`, fallback),
        sourceNote: (id: string, fallback: string) => pick(`source.${slug(id)}`, fallback),
    };
}
/** For components. In an async page use labels(await getTranslations("Data")). */
export function useLabels() {
    return labels(useTranslations("Data") as unknown as Translator);
}
