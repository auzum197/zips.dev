/* Loader for the Pagefind full-text index (built by `pnpm build`). Shared by
 * the search page and the command palette. */
export type PagefindResultData = {
    url: string;
    excerpt: string;
    meta?: {
        title?: string;
        display_name?: string;
    };
};
export type Pagefind = {
    search: (query: string) => Promise<{
        results: {
            data: () => Promise<PagefindResultData>;
        }[];
    }>;
};
declare global {
    interface Window {
        pagefind?: Pagefind;
    }
}
const INDEX_URL = "/pagefind/pagefind.js";
let indexMissing = false;
let pagefindPromise: Promise<Pagefind> | null = null;

// pagefind.js is an ES module — load it with a native dynamic import
// (webpackIgnore keeps Next from trying to bundle a runtime URL).
export function loadPagefind(): Promise<Pagefind> {
    if (window.pagefind)
        return Promise.resolve(window.pagefind);
    if (indexMissing)
        return Promise.reject(new Error("pagefind index missing"));
    pagefindPromise ??= (async () => {
        try {
            const url = INDEX_URL;
            const mod = (await import(/* webpackIgnore: true */ url)) as Partial<Pagefind> & {
                default?: Pagefind;
            };
            const pf = (mod.search ? mod : mod?.default) as Pagefind | undefined;
            if (!pf?.search)
                throw new Error("pagefind loaded but no search function found");
            return pf;
        }
        catch (e) {
            pagefindPromise = null;
            indexMissing = true;
            throw e instanceof Error ? e : new Error(`failed to load ${INDEX_URL}`);
        }
    })();
    return pagefindPromise;
}

/** The first `limit` results for a query, with their data loaded. */
export async function searchPagefind(query: string, limit: number): Promise<PagefindResultData[]> {
    const pagefind = await loadPagefind();
    const res = await pagefind.search(query);
    return Promise.all(res.results.slice(0, limit).map((r) => r.data()));
}
