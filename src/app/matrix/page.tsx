import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import ImplementationMatrix from "@/components/implementation-matrix";
import PageHeader from "@/components/page-header";
import { getImplementations, getNumberedZips } from "@/lib/data";
export const metadata: Metadata = ogMetadata({
    title: "Implementation matrix",
    description: "Which Zcash implementations ship which ZIPs: a per-ZIP support grid across consensus nodes, SDKs, and wallets.",
    path: "/matrix/",
    card: "matrix",
});
export default function MatrixPage() {
    const impls = getImplementations();
    const zips = getNumberedZips().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return (<>
      <PageHeader title="Implementation matrix" intro="ZIP × implementation support grid. ✓ means the implementation ships the ZIP. Community-curated — corrections via PR."/>
      <ImplementationMatrix impls={impls} zips={zips}/>
    </>);
}
