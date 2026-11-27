import assert from "node:assert/strict";
import { test } from "node:test";
import { splitDiff } from "./patches.mjs";

const diff = [
    "diff --git a/zips/zip-0324.rst b/zips/zip-0324.rst",
    "index 1111111..2222222 100644",
    "--- a/zips/zip-0324.rst",
    "+++ b/zips/zip-0324.rst",
    "@@ -1,2 +1,2 @@",
    " title",
    "-old",
    "+new",
    "@@ -10,1 +10,2 @@",
    " ctx",
    "+++ b/not-a-header",
    "diff --git a/protocol/nu5.pdf b/protocol/nu5.pdf",
    "index 3333333..4444444 100644",
    "Binary files a/protocol/nu5.pdf and b/protocol/nu5.pdf differ",
    "diff --git a/zips/zip-0001.rst b/zips/zip-0001.rst",
    "deleted file mode 100644",
    "index 5555555..0000000",
    "--- a/zips/zip-0001.rst",
    "+++ /dev/null",
    "@@ -1,1 +0,0 @@",
    "-gone",
    "",
].join("\n");

test("a patch starts at the first hunk and has no file header", () => {
    assert.equal(splitDiff(diff).get("zips/zip-0324.rst"), ["@@ -1,2 +1,2 @@", " title", "-old", "+new", "@@ -10,1 +10,2 @@", " ctx", "+++ b/not-a-header"].join("\n"));
});

test("a binary file has no patch", () => {
    assert.equal(splitDiff(diff).has("protocol/nu5.pdf"), false);
});

test("a removed file is found by its old name", () => {
    assert.equal(splitDiff(diff).get("zips/zip-0001.rst"), "@@ -1,1 +0,0 @@\n-gone");
});
