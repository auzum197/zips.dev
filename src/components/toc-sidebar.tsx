import ZipToc from "@/components/zip-toc";
import type { ZipHeading } from "@/lib/types";
import { cn } from "@/lib/utils";
export default function TocSidebar({ headings, className, }: {
    headings: ZipHeading[];
    className?: string;
}) {
    return (<aside className={cn("group/ztoc absolute left-0 top-6 bottom-0 hidden w-64 min-[70rem]:block", className)}>
      <button type="button" aria-label="Show table of contents" className="sticky top-[4.5rem] z-10 hidden h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-muted-foreground zen:pointer-events-auto zen:grid zen:bg-background/70 zen:transition-opacity zen:duration-[600ms] zen:delay-250 zen:hover:text-foreground zen:group-hover/ztoc:pointer-events-none zen:group-hover/ztoc:opacity-0 zen:group-hover/ztoc:delay-0 zen:group-hover/ztoc:duration-[400ms]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M9 6h11"/>
          <path d="M9 12h11"/>
          <path d="M9 18h11"/>
          <path d="M5 6v.01"/>
          <path d="M5 12v.01"/>
          <path d="M5 18v.01"/>
        </svg>
      </button>
      <div className="toc-scroll sticky top-[4.5rem] max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 [overscroll-behavior:contain] zen:pointer-events-none zen:opacity-0 zen:transition-opacity zen:duration-[600ms] zen:delay-250 zen:[transition-timing-function:cubic-bezier(0.23,1,0.32,1)] zen:group-hover/ztoc:pointer-events-auto zen:group-hover/ztoc:opacity-100 zen:group-hover/ztoc:delay-0 zen:group-hover/ztoc:duration-[400ms]">
        <ZipToc headings={headings}/>
      </div>
    </aside>);
}
