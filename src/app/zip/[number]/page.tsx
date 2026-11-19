import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getNumberedZips, getZipByNumber, localTitle } from "@/lib/data";
import ZipPage from "@/components/zip-page";
export const dynamicParams = false;
export function generateStaticParams() {
    return getNumberedZips()
        .filter((z) => z.number !== null)
        .map((z) => ({ number: String(z.number) }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        number: string;
    }>;
}): Promise<Metadata> {
    const { number } = await params;
    const zip = /^\d+$/.test(number) ? getZipByNumber(Number(number)) : undefined;
    if (!zip)
        return {};
    return ogMetadata({ title: `ZIP ${zip.number}: ${localTitle(zip, await getLocale())}`, path: `/zip/${number}/`, card: zip.slug });
}
export default async function Page({ params, }: {
    params: Promise<{
        number: string;
    }>;
}) {
    const { number } = await params;
    const zip = /^\d+$/.test(number) ? getZipByNumber(Number(number)) : undefined;
    if (!zip || zip.number === null)
        notFound();
    return <ZipPage zip={zip}/>;
}
