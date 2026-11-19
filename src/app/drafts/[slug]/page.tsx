import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getDrafts, getZipBySlug, localTitle } from "@/lib/data";
import ZipPage from "@/components/zip-page";
export const dynamicParams = false;
export function generateStaticParams() {
    return getDrafts().map((z) => ({ slug: z.slug }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        slug: string;
    }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const zip = getZipBySlug(slug);
    if (!zip || zip.kind !== "draft")
        return {};
    return ogMetadata({ title: localTitle(zip, await getLocale()), path: `/drafts/${slug}/`, card: zip.slug });
}
export default async function Page({ params, }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    const zip = getZipBySlug(slug);
    if (!zip || zip.kind !== "draft")
        notFound();
    return <ZipPage zip={zip}/>;
}
