import { cn } from "@/lib/utils";
/** The AuZ wordmark: the same two typefaces and proportions as the logo of
 *  auzum197.com. It takes its size from the font size of its parent. */
export default function AuzLogo({ className }: {
    className?: string;
}) {
    return (<span role="img" aria-label="AuZ" className={cn("inline-flex select-none items-baseline leading-none", className)}>
      <span aria-hidden className="font-logo-au">Au</span>
      <span aria-hidden className="-ml-[0.02em] font-logo-z text-[1.42em] leading-[0]">Z</span>
    </span>);
}
