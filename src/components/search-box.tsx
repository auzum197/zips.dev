"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
type PagefindResultData = {
    url: string;
    excerpt: string;
    meta?: {
        title?: string;
        display_name?: string;
    };
};
type Pagefind = {
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
const DEBOUNCE_MS = 150;
const MAX_RESULTS = 25;
let indexMissing = false;
function loadPagefind(): Promise<Pagefind> {
    if (indexMissing)
        return Promise.reject(new Error("pagefind index missing"));
    if (window.pagefind)
        return Promise.resolve(window.pagefind);
    return new Promise((resolve, reject) => {
        let script = document.querySelector<HTMLScriptElement>(`script[src="${INDEX_URL}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = INDEX_URL;
            script.async = true;
            document.head.appendChild(script);
        }
        script.addEventListener("load", () => {
            if (window.pagefind)
                resolve(window.pagefind);
            else {
                indexMissing = true;
                reject(new Error("pagefind loaded but window.pagefind is missing"));
            }
        });
        script.addEventListener("error", () => {
            indexMissing = true;
            reject(new Error(`failed to load ${INDEX_URL}`));
        });
    });
}
export default function SearchBox() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PagefindResultData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const reqId = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (timer.current)
            clearTimeout(timer.current);
    }, []);
    async function run(q: string) {
        const id = ++reqId.current;
        setLoading(true);
        try {
            const pagefind = await loadPagefind();
            const res = await pagefind.search(q);
            const data = await Promise.all(res.results.slice(0, MAX_RESULTS).map((r) => r.data()));
            if (id !== reqId.current)
                return;
            setResults(data);
            setError(null);
            setSearched(true);
        }
        catch {
            if (id !== reqId.current)
                return;
            setResults([]);
            setError("Search index not found — run the production build.");
        }
        finally {
            if (id === reqId.current)
                setLoading(false);
        }
    }
    function onChange(e: ChangeEvent<HTMLInputElement>) {
        const q = e.target.value;
        setQuery(q);
        if (timer.current)
            clearTimeout(timer.current);
        if (!q.trim()) {
            ++reqId.current;
            setResults([]);
            setError(null);
            setSearched(false);
            setLoading(false);
            return;
        }
        timer.current = setTimeout(() => run(q), DEBOUNCE_MS);
    }
    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (timer.current)
            clearTimeout(timer.current);
        if (query.trim())
            run(query);
    }
    return (<div className="mt-4 max-w-2xl">
      <form onSubmit={onSubmit} role="search">
        <Input type="search" value={query} onChange={onChange} placeholder="Search ZIPs…" aria-label="Search ZIPs" autoFocus enterKeyHint="search" className="h-11 text-base"/>
      </form>

      {error && <p className="mt-4 text-sm text-warn">{error}</p>}
      {!error && loading && (<p className="mt-4 text-sm text-muted-foreground">Searching…</p>)}
      {!error && !loading && searched && results.length === 0 && (<p className="mt-4 text-sm text-muted-foreground">No results for “{query}”.</p>)}

      <ul className="mt-5 list-none divide-y divide-border-subtle p-0">
        {results.map((r) => (<li key={r.url} className="py-3">
            <a href={r.url} className="font-medium hover:text-accent">
              {r.meta?.title ?? r.meta?.display_name ?? r.url}
            </a>
            <span className="block truncate font-mono text-xs text-faint">{r.url}</span>
            <p className="mt-1.5 text-sm text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-warn-soft [&_mark]:text-warn" dangerouslySetInnerHTML={{ __html: r.excerpt }}/>
          </li>))}
      </ul>
    </div>);
}
