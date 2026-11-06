import type { ReactNode } from "react";
export default function PanelSection({ title, children, }: {
    title: string;
    children: ReactNode;
}) {
    return (<section className="min-w-0">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">
        {title}
      </h2>
      {children}
    </section>);
}
