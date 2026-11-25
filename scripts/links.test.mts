/* Tests for where the relative links of an upstream document go.
 *
 *   pnpm test
 *
 * Each case is a link form that occurs in zcash/zips.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveLink, rewriteLinks, upstreamRefs, type LinkContext } from "./links.mjs";

const ctx: LinkContext = {
    routes: new Map([
        ["zip-0200", "/zip/200/"],
        ["zip-0207", "/zip/207/"],
        ["draft-arya-deploy-nu7", "/drafts/draft-arya-deploy-nu7/"],
    ]),
    assets: new Set(["zip-0307-arch.png", "zip-0316-f3.svg", "zip-0316-f3.png"]),
};

test("a link to a document goes to its page", () => {
    for (const link of ["zip-0200.rst", "zip-0200.md", "zip-0200.html", "zip-0200", "zip-200", "ZIP-0200.rst"])
        assert.equal(resolveLink(link, ctx), "/zip/200/", link);
    assert.equal(resolveLink("draft-arya-deploy-nu7.md", ctx), "/drafts/draft-arya-deploy-nu7/");
});

test("a link to a document keeps its fragment", () => {
    assert.equal(resolveLink("zip-0207#abstract", ctx), "/zip/207/#abstract");
    assert.equal(resolveLink("zip-0200.rst#specification", ctx), "/zip/200/#specification");
});

test("a link to a document this site does not have goes to zips.z.cash", () => {
    assert.equal(resolveLink("zip-0318", ctx), "https://zips.z.cash/zip-0318");
    assert.equal(resolveLink("zip-0316-deriving-a-unified-address-from-a-uivk.rst", ctx), "https://zips.z.cash/zip-0316-deriving-a-unified-address-from-a-uivk.rst");
});

test("the protocol specification stays on zips.z.cash", () => {
    assert.equal(resolveLink("protocol/protocol.pdf#merkletree", ctx), "https://zips.z.cash/protocol/protocol.pdf#merkletree");
    assert.equal(resolveLink("protocol/nu6_1.pdf", ctx), "https://zips.z.cash/protocol/nu6_1.pdf");
});

test("an image comes from public/upstream", () => {
    assert.equal(resolveLink("../rendered/assets/images/zip-0307-arch.png", ctx), "/upstream/zip-0307-arch.png");
    assert.equal(resolveLink("rendered/assets/images/zip-0307-arch.png", ctx), "/upstream/zip-0307-arch.png");
    assert.equal(resolveLink("zip-0316-f3.svg", ctx), "/upstream/zip-0316-f3.svg");
});

test("a PNG gives way to the SVG of the same name", () => {
    assert.equal(resolveLink("../rendered/assets/images/zip-0316-f3.png", ctx), "/upstream/zip-0316-f3.svg");
});

test("an image this site does not have goes to zips.z.cash", () => {
    assert.equal(resolveLink("../rendered/assets/images/zip-0999-new.png", ctx), "https://zips.z.cash/assets/images/zip-0999-new.png");
});

test("an image a pull request changes comes from the PR head", () => {
    const head = "https://raw.githubusercontent.com/someone/zips/abc123/static/assets/images";
    const pr: LinkContext = {
        ...ctx,
        prAssets: new Map([
            ["zip-0999-new.png", `${head}/zip-0999-new.png`],
            ["zip-0307-arch.png", `${head}/zip-0307-arch.png`],
        ]),
    };
    assert.equal(resolveLink("../rendered/assets/images/zip-0999-new.png", pr), `${head}/zip-0999-new.png`);
    assert.equal(resolveLink("../rendered/assets/images/zip-0307-arch.png", pr), `${head}/zip-0307-arch.png`);
    assert.equal(resolveLink("../rendered/assets/images/zip-0316-f3.png", pr), "/upstream/zip-0316-f3.svg");
});

test("a pull request links to its own version of a document", () => {
    const pr: LinkContext = { ...ctx, routes: new Map([...ctx.routes, ["zip-0200", "/prs/1202/zip-0200/"]]) };
    assert.equal(resolveLink("zip-0200.rst#abstract", pr), "/prs/1202/zip-0200/#abstract");
    assert.equal(resolveLink("zip-0207.rst", pr), "/zip/207/");
});

test("an absolute link does not change", () => {
    for (const link of ["https://example.com/a.png", "HTTP://bitcoin.sipa.be/bech32/demo/demo.html", "mailto:zips@z.cash", "#abstract", "/zip/200/", "//example.com/x", ""])
        assert.equal(resolveLink(link, ctx), link, link);
});

test("rewriteLinks changes src and href attributes only", () => {
    const html = '<p><a class="reference" href="zip-0200.rst">ZIP 200</a> <img alt="zip-0200.rst" src="../rendered/assets/images/zip-0307-arch.png" /> <code>href=&quot;zip-0200.rst&quot;</code> <a data-href="zip-0200.rst" href="#x">x</a></p>';
    assert.equal(rewriteLinks(html, ctx), '<p><a class="reference" href="/zip/200/">ZIP 200</a> <img alt="zip-0200.rst" src="/upstream/zip-0307-arch.png" /> <code>href=&quot;zip-0200.rst&quot;</code> <a data-href="zip-0200.rst" href="#x">x</a></p>');
});

test("upstreamRefs lists the public/upstream files of a page", () => {
    assert.deepEqual(upstreamRefs('<img src="/upstream/zip-0307-arch.png" /><a href="/upstream/a.svg#top">a</a><a href="/zip/200/">b</a>'), ["zip-0307-arch.png", "a.svg"]);
});
