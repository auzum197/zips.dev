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
import SiteFooter from "@/components/site-footer";
import ScrollReset from "@/components/scroll-reset";
import HeaderAutohide from "@/components/header-autohide";
export const metadata: Metadata = {
    title: {
        default: "zipreader",
        template: "%s · zipreader",
    },
    description: "Unofficial explorer for Zcash Improvement Proposals: rendered ZIPs, open PRs, implementations, and network upgrade timelines.",
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
        <SiteNav />
        <div id="scroll-root" className="min-h-0 flex-1 overflow-y-auto">
          <ScrollReset />
          <HeaderAutohide />
          <main className="mx-auto w-full max-w-[88rem] px-5 pb-12">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>);
}
