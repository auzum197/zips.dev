"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
export default function MatrixFilter({ total }: {
    total: number;
}) {
    const t = useTranslations("Matrix");
    const tc = useTranslations("Common");
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
      <Input type="search" placeholder={t("filterPlaceholder")} aria-label={t("filterLabel")} onInput={onInput} className="h-8 max-w-xs"/>
      {count !== null && (<span className="text-xs text-muted-foreground" role="status">
          {tc("of", { count, total })}
        </span>)}
    </>);
}
