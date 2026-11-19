/* Set <html lang> on the exported pages of each language.
 *
 *   tsx scripts/html-lang.mts        (after `next build`, before pagefind)
 *
 * All languages share one root layout, which is what keeps the header alive
 * on a language change. The cost: the layout cannot know the language, so
 * every exported page says lang="en". This fixes the files under out/<code>/.
 * Pagefind reads the attribute to keep one search index per language.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIXED_LOCALES } from "../src/i18n/config";

const OUT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "out");

function* htmlFiles(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            yield* htmlFiles(full);
        else if (entry.name.endsWith(".html"))
            yield full;
    }
}

for (const locale of PREFIXED_LOCALES) {
    const dir = path.join(OUT, locale);
    if (!fs.existsSync(dir)) {
        console.error(`html-lang: ${dir} does not exist: run \`next build\` first`);
        process.exit(1);
    }
    let count = 0;
    for (const file of htmlFiles(dir)) {
        const html = fs.readFileSync(file, "utf8");
        const fixed = html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`);
        if (fixed !== html) {
            fs.writeFileSync(file, fixed);
            count++;
        }
    }
    console.log(`html-lang: ${locale}: ${count} pages`);
}
