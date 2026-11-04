import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
const plexSans = IBM_Plex_Sans({
    weight: ["400", "500", "600"],
    subsets: ["latin"],
    variable: "--font-plex-sans",
    display: "swap",
});
const plexMono = IBM_Plex_Mono({
    weight: ["400", "500", "600"],
    subsets: ["latin"],
    variable: "--font-plex-mono",
    display: "swap",
});
const plexSerif = IBM_Plex_Serif({
    weight: ["600"],
    subsets: ["latin"],
    variable: "--font-plex-serif",
    display: "swap",
});
export const metadata: Metadata = {
    title: {
        default: "zips.dev",
        template: "%s · zips.dev",
    },
    description: "Unofficial explorer for Zcash Improvement Proposals: rendered ZIPs, open PRs, implementations, and network upgrade timelines.",
};
const themeInit = `try{var t=localStorage.getItem("zd-theme");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.add("light");}catch(e){}`;
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable} ${plexSerif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }}/>
      </head>
      <body>
        <SiteNav />
        <main className="mx-auto w-full max-w-[88rem] px-5 pb-12">{children}</main>
        <SiteFooter />
      </body>
    </html>);
}
