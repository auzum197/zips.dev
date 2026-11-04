"use client";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
export default function MatrixFilter({ total }: {
    total: number;
}) {
    const [count, setCount] = useState<number | null>(null);
    function onInput(e: FormEvent<HTMLInputElement>) {
        const q = e.currentTarget.value.trim().toLowerCase();
        let visible = 0;
        document.querySelectorAll<HTMLElement>("#mtx-table tbody tr").forEach((row) => {
            const hit = q === "" || (row.dataset.q ?? "").includes(q);
            row.hidden = !hit;
            if (hit)
                visible++;
        });
        setCount(q === "" ? null : visible);
    }
    return (<>
      <Input type="search" placeholder="Filter by number or title…" aria-label="Filter ZIPs by number or title" onInput={onInput} className="h-8 max-w-xs"/>
      {count !== null && (<span className="text-xs text-muted-foreground" role="status">
          {count} of {total}
        </span>)}
    </>);
}
