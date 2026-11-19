import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    env: {
        NEXT_PUBLIC_UPSTREAM_COMMIT: process.env.ZIPS_UPSTREAM_COMMIT || "unknown",
        NEXT_PUBLIC_SYNC_TIME: process.env.ZIPS_SYNC_TIME || new Date().toISOString(),
    },
};

export default withNextIntl(nextConfig);
