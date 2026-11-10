import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import ZenToggle from "./zen-toggle";
const links = [
    { href: "/", label: "ZIPs" },
    { href: "/drafts/", label: "Drafts" },
    { href: "/new/", label: "New" },
    { href: "/prs/", label: "PRs" },
    { href: "/external/", label: "External" },
    { href: "/matrix/", label: "Matrix" },
    { href: "/upgrades/", label: "Upgrades" },
    { href: "/search/", label: "Search" },
];
export default function SiteNav() {
    return (<header id="site-header" className="z-40 shrink-0 border-b border-border-subtle bg-background zen:border-transparent zen:bg-transparent zen:pointer-events-none">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2 min-[48rem]:h-[3.25rem] min-[48rem]:flex-nowrap min-[48rem]:gap-y-0 min-[48rem]:py-0">
        <Link href="/" className="zen-dim font-mono text-base font-semibold tracking-tight hover:text-accent hover:no-underline">
          zip<span className="text-accent">reader</span>
        </Link>
        <nav aria-label="Main" className="zen-dim order-last -mx-2.5 flex w-[calc(100%+1.25rem)] gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[48rem]:order-none min-[48rem]:mx-0 min-[48rem]:ml-2 min-[48rem]:w-auto">
          {links.map((l) => (<Link key={l.href} href={l.href} className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground whitespace-nowrap min-[48rem]:py-1 hover:bg-muted hover:text-foreground hover:no-underline">
              {l.label}
            </Link>))}
        </nav>
        <div className="ml-auto flex items-center">
          <div className="zen-dim">
            <ThemeToggle />
          </div>
          <ZenToggle />
        </div>
      </div>
    </header>);
}
