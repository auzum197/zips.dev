import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-serif/600.css";
import "./globals.css";
import SiteNav from "@/components/site-nav";
import CommandPalette from "@/components/command-palette";
import SiteFooter from "@/components/site-footer";
import ScrollReset from "@/components/scroll-reset";
import HeaderAutohide from "@/components/header-autohide";
import { getMeta } from "@/lib/data";
import I18nProvider from "@/i18n/provider";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OG_CARDS, ORIGIN, SITE, ogImage } from "@/lib/og";
export const metadata: Metadata = {
    metadataBase: new URL(ORIGIN),
    title: {
        default: SITE,
        template: `%s · ${SITE}`,
    },
    description: "Unofficial explorer for Zcash Improvement Proposals: rendered ZIPs, open PRs, implementations, and network upgrade timelines.",
    openGraph: {
        url: "/",
        siteName: SITE,
        type: "website",
        locale: "en_US",
        // routes override this with their section card; dynamic routes and
        // anything without its own metadata fall back to the home card.
        images: [
            {
                url: ogImage(),
                width: 1200,
                height: 630,
                alt: OG_CARDS[0].alt,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
    },
};
const themeInit = `try{var t=localStorage.getItem("zd-theme");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.add("light");}catch(e){}`;
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }}/>
      </head>
      <body className="flex h-full flex-col">
        {/* One layout for all languages: the header stays mounted on a language
            change. Client components read their text from this provider. */}
        <I18nProvider messages={{ en, es }}>
          <SiteNav />
          <div id="scroll-root" className="min-h-0 flex-1 overflow-y-auto">
            <ScrollReset />
            <HeaderAutohide />
            <main className="mx-auto w-full max-w-[88rem] px-5 pb-12">{children}</main>
            <SiteFooter meta={getMeta()}/>
          </div>
          <CommandPalette />
        </I18nProvider>
      </body>
    </html>);
}
