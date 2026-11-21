/* Tests for the rules that decide what a translated page says.
 *
 *   pnpm test
 *
 * They cover the code, not the model: how a page is cut into segments, what
 * the checks accept and reject, and how the review loop ends. Each test is a
 * case that went wrong in a real run, or a rule a reader depends on. No test
 * calls GLM.
 */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import { fromHtml } from "hast-util-from-html";
import type { Root } from "hast";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addGlosses, collect, freshness, seedMemory, staleReport, countTerm, glossaryFor, rebuild, reviewAll, setKeep, setModel, withEntities, type Glossary, type Review, type Segment } from "./translate.mjs";

const parse = (html: string): Root => fromHtml(html, { fragment: true });
const toHtml = (tree: Root): string => unified().use(rehypeStringify).stringify(tree);
const segmentsOf = (html: string): Segment[] => {
    const out: Segment[] = [];
    collect(parse(html), out);
    return out;
};
/** A segment with no markup. */
const plain = (source: string, extra: Partial<Segment> = {}): Segment => ({ source, slots: new Map(), lead: "", trail: "", apply: () => { }, kind: "paragraph", section: "", ...extra });

beforeEach(() => setKeep([]));

/* ---------- segmentation ---------- */

test("an inline formula stays in its sentence", () => {
    // run 3: inline <math> cut sentences in two, and the model "completed" the halves
    const [seg, ...rest] = segmentsOf('<p>The fee is <math><mi>x</mi></math> zatoshis for each action.</p>');
    assert.equal(rest.length, 0);
    assert.equal(seg.source, "The fee is <x1/> zatoshis for each action.");
    assert.equal(seg.cut, undefined);
});

test("a formula on its own line cuts the sentence, and both parts say so", () => {
    const segs = segmentsOf('<li>the weight is defined as <pre class="math">w = a / b</pre> where a is the fee.</li>');
    assert.deepEqual(segs.map((s) => [s.source, s.cut]), [["the weight is defined as", "after"], ["where a is the fee.", "before"]]);
});

test("code, block formulas and the reference list are never sent", () => {
    const segs = segmentsOf('<p>Text.</p><pre>code MUST stay</pre><aside class="footnote brackets"><p>RFC 2119: Key words</p></aside>');
    assert.deepEqual(segs.map((s) => s.source), ["Text."]);
});

test("each segment knows its kind and its section", () => {
    const segs = segmentsOf('<h1 id="a"><a class="hanchor" href="#a">#</a>Motivation</h1><p>Why.</p><ul><li>One item.</li></ul>');
    assert.deepEqual(segs.map((s) => [s.kind, s.section]), [["heading", ""], ["paragraph", "Motivation"], ["list item", "Motivation"]]);
});

test("a translation goes back into the same markup", () => {
    const tree = parse('<p>See <a href="/zip/200/">the <em>upgrade</em> ZIP</a> and <code>nVersion</code>.</p>');
    const segs: Segment[] = [];
    collect(tree, segs);
    assert.equal(segs[0].source, "See <g1>the <g2>upgrade</g2> ZIP</g1> and <x3/>.");
    segs[0].apply(rebuild(segs[0], "Consulte <g1>el ZIP de <g2>actualización</g2></g1> y <x3/>."));
    assert.equal(toHtml(tree), '<p>Consulte <a href="/zip/200/">el ZIP de <em>actualización</em></a> y <code>nVersion</code>.</p>');
});

/* ---------- checks on a translation ---------- */

test("each placeholder is used exactly once", () => {
    const [seg] = segmentsOf("<p>Use <code>a</code> and <code>b</code>.</p>");
    assert.throws(() => rebuild(seg, "Use <x1/>."), /placeholders missing: <x2\/>/);
    assert.throws(() => rebuild(seg, "Use <x1/> y <x1/> y <x2/>."), /bad placeholder/);
    assert.throws(() => rebuild(seg, "Use <x1/> y <x2/> y <x9/>."), /unknown placeholder/);
    assert.doesNotThrow(() => rebuild(seg, "Use <x2/> y <x1/>."));
});

test("a BCP 14 key word is Spanish capitals with the English in parentheses", () => {
    const seg = plain("Nodes MUST reject the block and MAY log it.");
    assert.doesNotThrow(() => rebuild(seg, "Los nodos DEBEN (MUST) rechazar el bloque y PUEDEN (MAY) registrarlo."));
    assert.throws(() => rebuild(seg, "Los nodos MUST rechazar el bloque y PUEDEN (MAY) registrarlo."), /parentheses/);
    assert.throws(() => rebuild(seg, "Los nodos DEBEN rechazar el bloque y PUEDEN (MAY) registrarlo."), /keywords changed/);
});

test('a lowercase "should" does not become a normative key word', () => {
    // run 1, ZIP 317: "should monitor" came back as "DEBERÍAN (SHOULD)"
    const seg = plain("Wallet developers should monitor the network.");
    assert.throws(() => rebuild(seg, "Los desarrolladores DEBERÍAN (SHOULD) vigilar la red."), /no key word in capitals/);
    assert.doesNotThrow(() => rebuild(seg, "Los desarrolladores deberían vigilar la red."));
});

test("every number of the source is in the translation", () => {
    // run 4, ZIP 317: "Revision 2" came back as "Revisión 3"
    const seg = plain("10 from Revision 2, or 0.00001 ZEC (1,000 zatoshis), which is 8%.");
    assert.throws(() => rebuild(seg, "10 desde la Revisión 3, o 0.00001 ZEC (1,000 zatoshis), que es el 8 %."), /numbers differ/);
    assert.doesNotThrow(() => rebuild(seg, "10 desde la Revisión 2, o 0,00001 ZEC (1.000 zatoshis), que es el 8 %."));
});

test("a number of one digit can be a Spanish word, and 500k can be 500 000", () => {
    assert.doesNotThrow(() => rebuild(plain("The 2-way pegged sidechain needs it."), "La cadena lateral anclada en dos sentidos lo necesita."));
    assert.doesNotThrow(() => rebuild(plain("Both end at the 3rd halving, per Revision 3."), "Ambos terminan en el tercer halving, según la Revisión 3."));
    assert.doesNotThrow(() => rebuild(plain("More than $500k that month, or 25%."), "Más de 500 000 USD ese mes, o el 25 %."));
    assert.throws(() => rebuild(plain("Revision 2 has 12 rules."), "La Revisión dos tiene 13 reglas."), /numbers differ/);
    assert.throws(() => rebuild(plain("It needs 12 blocks."), "Necesita dos bloques y el primer bloque."), /numbers differ/);
    assert.throws(() => rebuild(plain("The 3rd halving."), "El segundo halving."), /numbers differ/);
});

test("the full run: three checks that rejected correct text", () => {
    // "MUST-understand" is a term of ZIP 316, not a key word
    assert.doesNotThrow(() => rebuild(plain("Items in the MUST-understand range are kept."), "Los elementos del rango MUST-understand se conservan."));
    // a key word that the source puts in quotation marks
    assert.doesNotThrow(() => rebuild(plain('The key word "MUST" is normative.'), 'La palabra clave "DEBE" (MUST) es normativa.'));
    // Spanish writes 2,550 with no separator
    assert.doesNotThrow(() => rebuild(plain("It spans 2,550 seconds."), "Abarca 2550 segundos."));
    assert.throws(() => rebuild(plain("It spans 2,550 seconds."), "Abarca 2560 segundos."), /numbers differ/);
});

test("a kept term of the source is in the translation", () => {
    setKeep(["Major Grants", "fork", "Tor"]);
    assert.throws(() => rebuild(plain("The Major Grants slice."), "La parte de las subvenciones mayores."), /"Major Grants" stays in English/);
    // a capital letter makes it a name: lowercase "major grants" is normal prose
    assert.doesNotThrow(() => rebuild(plain("Priority goes to major grants."), "Se da prioridad a las subvenciones importantes."));
    // a plural of a kept word counts
    assert.doesNotThrow(() => rebuild(plain("Two forks exist."), "Existen dos forks."));
    // "Tor" is not in "editors"
    assert.doesNotThrow(() => rebuild(plain("The editors decide."), "Los editores deciden."));
});

test("a letter from another alphabet is rejected", () => {
    // run 1, ZIP 200: "borradо" with a Cyrillic о
    assert.throws(() => rebuild(plain("Wipe-out protection"), "Protección contra el borradо"), /Latin alphabet/);
});

test("a document title must come back translated", () => {
    // run 3, ZIP 317: the title came back in English and the reviewer passed it
    assert.throws(() => rebuild(plain("Proportional Transfer Fee Mechanism", { title: true }), "Proportional Transfer Fee Mechanism"), /still in English/);
    // a title that is only an identifier has no words to translate
    assert.doesNotThrow(() => rebuild(plain("CHECKSEQUENCEVERIFY", { title: true }), "CHECKSEQUENCEVERIFY"));
});

test("an empty translation is rejected", () => {
    assert.throws(() => rebuild(plain("Text."), "  "), /empty/);
});

/* ---------- glossary ---------- */

const GLOSSARY: Glossary = {
    keep: ["mempool"],
    terms: { wallet: "billetera" },
    entities: [
        { name: "Zcash Community Grants", short: "ZCG", gloss: "Subvenciones de la Comunidad de Zcash" },
        { name: "Zcash Community Grants Committee" },
        { name: "Dev Fund", gloss: "Fondo de Desarrollo" },
        { name: "Deferred Dev Fund Lockbox", gloss: "Lockbox Diferido del Fondo de Desarrollo" },
        { name: "ZIP Editors", es: "Editores de ZIP" },
        { name: "Tor" },
    ],
};

test("entities fold into the kept names and the fixed terms", () => {
    const g = withEntities(GLOSSARY);
    assert.deepEqual(g.keep, ["mempool", "Zcash Community Grants", "ZCG", "Zcash Community Grants Committee", "Dev Fund", "Deferred Dev Fund Lockbox", "Tor"]);
    assert.deepEqual(g.terms, { wallet: "billetera", "ZIP Editors": "Editores de ZIP" });
});

test("a request carries only the terms of its text, as whole words", () => {
    const g = withEntities(GLOSSARY);
    assert.deepEqual(glossaryFor(g, "The ZIP Editors and ZCG use a Wallet."), { keep: ["ZCG"], terms: { wallet: "billetera", "ZIP Editors": "Editores de ZIP" } });
    assert.equal(countTerm("the editors", "Tor"), 0);
});

/* ---------- glosses ---------- */

const glossed = (html: string): string => {
    const tree = parse(html);
    addGlosses(tree, GLOSSARY);
    return toHtml(tree);
};

test("a gloss goes after the first appearance in the body, one time", () => {
    assert.equal(glossed("<h1>Dev Fund</h1><p>The Dev Fund pays.</p><p>The Dev Fund ends.</p>"), "<h1>Dev Fund</h1><p>The Dev Fund (Fondo de Desarrollo) pays.</p><p>The Dev Fund ends.</p>");
});

test("the longest name wins", () => {
    // "Dev Fund" inside the lockbox name is not an appearance of "Dev Fund"
    assert.equal(glossed("<p>A Deferred Dev Fund Lockbox holds it.</p>"), "<p>A Deferred Dev Fund Lockbox (Lockbox Diferido del Fondo de Desarrollo) holds it.</p>");
    // a longer name with no gloss takes the match, so the shorter one gets none here
    assert.equal(glossed("<p>The Zcash Community Grants Committee meets.</p>"), "<p>The Zcash Community Grants Committee meets.</p>");
});

test("a gloss joins the short form that is already in parentheses", () => {
    assert.equal(glossed("<p>Zcash Community Grants (ZCG) funds teams.</p>"), "<p>Zcash Community Grants (ZCG, Subvenciones de la Comunidad de Zcash) funds teams.</p>");
});

test("code and the reference list get no gloss", () => {
    const html = '<p><code>Dev Fund</code></p><aside class="footnote brackets"><p>Dev Fund</p></aside>';
    assert.equal(glossed(html), html);
});

/* ---------- review loop ---------- */

const DOC = { title: "ZIP: Test", glossary: {} };
async function review(source: string, first: string, replies: Record<string, unknown>[]) {
    const seg = plain(source);
    const wanted = new Map([[source, seg]]);
    const memory: Record<string, string> = { [source]: first };
    const reviews: Record<string, Review> = {};
    let calls = 0;
    setModel(async () => ({ "1": replies[Math.min(calls++, replies.length - 1)] }));
    const write = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write; // the loop prints its progress
    try {
        await reviewAll("", DOC, wanted, memory, reviews);
    }
    finally {
        process.stdout.write = write;
    }
    return { text: memory[source], review: reviews[source], calls };
}

test("a correct translation passes at the first review", async () => {
    const r = await review("The fee is fixed.", "La comisión es fija.", [{ ok: true }]);
    assert.deepEqual([r.text, r.review.passed, r.review.rounds, r.calls], ["La comisión es fija.", true, 1, 1]);
});

test("a reported error is corrected in place, then reviewed again", async () => {
    const r = await review("The fee is fixed.", "La comisión estaba fija.", [{ ok: false, issue: "wrong tense", es: "La comisión es fija." }, { ok: true }]);
    assert.equal(r.text, "La comisión es fija.");
    assert.deepEqual([r.review.passed, r.review.rounds, r.review.first, r.review.issues], [true, 2, "La comisión estaba fija.", ["wrong tense"]]);
});

test("a correction that breaks a check is not published", async () => {
    const r = await review("Pay 2 zatoshis.", "Pague 2 zatoshis.", [{ ok: false, issue: "style", es: "Pague 3 zatoshis." }, { ok: true }]);
    assert.equal(r.text, "Pague 2 zatoshis.");
    assert.match(r.review.issues[1], /correction rejected: the numbers differ/);
});

test("the work of each batch is saved, so a stopped run loses none", async () => {
    // the first full run was stopped after 50 minutes and two large documents lost all their work
    const sources = Array.from({ length: 25 }, (_, i) => `Sentence number ${i}.`);
    const wanted = new Map(sources.map((s) => [s, plain(s)]));
    const memory = Object.fromEntries(sources.map((s, i) => [s, `Frase número ${i}.`]));
    const reviews: Record<string, Review> = {};
    setModel(async (_system, payload) => Object.fromEntries(Object.keys((payload as { segments: object }).segments).map((k) => [k, { ok: true }])));
    const saved: number[] = [];
    const write = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
        await reviewAll("", DOC, wanted, memory, reviews, () => saved.push(Object.values(reviews).filter((r) => r.passed).length));
    }
    finally {
        process.stdout.write = write;
    }
    assert.deepEqual(saved, [10, 20, 25]); // 25 segments are 3 batches of 10: one save after each
});

test("a segment that never passes stays in English", async () => {
    const r = await review("The fee is fixed.", "La comisión es fija.", [{ ok: false, issue: "still wrong", es: "La comisión es fija." }]);
    assert.equal(r.text, undefined); // removed from the memory: the page keeps the English text
    assert.deepEqual([r.review.passed, r.review.rounds, r.calls], [false, 3, 3]);
});

test("a pull request document takes the reviewed paragraphs of its ZIP", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zr-seed-"));
    const passed = { passed: true, rounds: 1, issues: [] };
    fs.writeFileSync(path.join(dir, "zip-0317.tm.json"), JSON.stringify({
        segments: { "Same paragraph.": "El mismo párrafo.", "Not reviewed.": "Sin revisar.", "Removed by the PR.": "Quitado." },
        reviews: { "Same paragraph.": passed, "Not reviewed.": { ...passed, passed: false }, "Removed by the PR.": passed },
    }));
    fs.writeFileSync(path.join(dir, "zip-0200.tm.json"), JSON.stringify({ segments: { "New paragraph.": "De otro documento." }, reviews: { "New paragraph.": passed } }));
    const wanted = new Map(["Same paragraph.", "Not reviewed.", "New paragraph."].map((s) => [s, plain(s)]));
    const memory: Record<string, string> = {};
    const reviews: Record<string, Review> = {};
    const taken = seedMemory({ key: "pr-1288-zip-0317", slug: "zip-0317", title: "", headings: [] }, wanted, memory, reviews, dir);
    fs.rmSync(dir, { recursive: true });
    // only a reviewed paragraph, of the same document, that this version still has
    assert.equal(taken, 1);
    assert.deepEqual(memory, { "Same paragraph.": "El mismo párrafo." });
    assert.equal(reviews["Same paragraph."].passed, true);
});

test("the report lists the documents whose page shows English", () => {
    const rendered = fs.mkdtempSync(path.join(os.tmpdir(), "zr-src-"));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zr-es-"));
    const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
    const docs = [{ key: "zip-0001", title: "One" }, { key: "zip-0002", title: "Two" }, { key: "zip-0003", title: "Three" }, { key: "zip-0004", title: "Four, new title" }];
    for (const d of docs)
        fs.writeFileSync(path.join(rendered, `${d.key}.html`), `<p>${d.key}</p>`);
    const translate = (key: string, html: string, title: string) => {
        fs.writeFileSync(path.join(dir, `${key}.html`), "<p>es</p>");
        fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify({ sourceSha: sha(`${html}\n${title}`) }));
    };
    translate("zip-0001", "<p>zip-0001</p>", "One");
    translate("zip-0002", "<p>older text</p>", "Two");
    translate("zip-0004", "<p>zip-0004</p>", "Four");
    assert.deepEqual(docs.map((d) => freshness(d, rendered, dir)), ["current", "changed", "missing", "changed"]);
    const report = staleReport(docs, rendered, dir);
    assert.equal(report.stale, 3);
    assert.match(report.text, /3 of 4 documents have no current Spanish translation/);
    assert.match(report.text, /- `zip-0003`: not translated/);
    assert.equal(staleReport(docs.slice(0, 1), rendered, dir).stale, 0);
});
