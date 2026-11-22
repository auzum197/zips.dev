"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { searchPagefind, type PagefindResultData } from "@/lib/pagefind";
export type { PagefindResultData };
const DEBOUNCE_MS = 150;
const MAX_RESULTS = 25;
export default function SearchBox() {
    const t = useTranslations("Search");
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
            const data = await searchPagefind(q, MAX_RESULTS);
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
            setError(t("indexMissing"));
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
        <Input type="search" value={query} onChange={onChange} placeholder={t("placeholder")} aria-label={t("label")} autoFocus enterKeyHint="search" className="h-11 text-base"/>
      </form>

      {error && <p className="mt-4 text-sm text-warn">{error}</p>}
      {!error && loading && (<p className="mt-4 text-sm text-muted-foreground">{t("searching")}</p>)}
      {!error && !loading && searched && results.length === 0 && (<p className="mt-4 text-sm text-muted-foreground">{t("noResults", { query })}</p>)}

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
