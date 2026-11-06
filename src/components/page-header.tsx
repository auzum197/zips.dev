import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export default function PageHeader({ title, intro, introClassName, }: {
    title: ReactNode;
    intro?: ReactNode;
    introClassName?: string;
}) {
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {intro !== undefined && intro !== null && (<p className={cn("mt-1 text-[0.9375rem] text-muted-foreground", introClassName)}>
          {intro}
        </p>)}
    </>);
}
