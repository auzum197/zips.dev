import type { Crossrefs, Implementation, NewProposal, PrMeta, Upgrade, UpstreamMeta, ZipMeta } from "@/lib/types";

export function makeZip(overrides: Partial<ZipMeta> = {}): ZipMeta {
    return {
        slug: "zip-0321",
        number: 321,
        displayNumber: "321",
        kind: "zip",
        filename: "zip-0321.md",
        format: "md",
        title: "Unified Addresses and Unified Viewing Keys",
        status: "Proposed",
        revision: 1,
        owners: ["Daira-Emma Hopwood <daira@zaptech.org>"],
        credits: ["Jack Grigg", "Sean Bowe"],
        originalAuthors: ["Daira-Emma Hopwood <daira@zaptech.org>", "Jack Grigg <jack@electriccoin.co>"],
        category: "Wallet",
        created: "2022-02-01",
        license: "MIT",
        discussionsTo: "https://github.com/zcash/zips/issues/498",
        pullRequests: [],
        upstreamPath: "zip-0321.md",
        upstreamUrl: "https://github.com/zcash/zips/blob/main/zip-0321.md",
        headings: [
            { level: 2, id: "abstract", text: "Abstract" },
            { level: 2, id: "motivation", text: "Motivation" },
            { level: 3, id: "requirements", text: "Requirements" },
            { level: 2, id: "specification", text: "Specification" },
        ],
        wordCount: 4812,
        rendered: true,
        ...overrides,
    };
}

export function makePr(overrides: Partial<PrMeta> = {}): PrMeta {
    return {
        repo: "zcash/zips",
        source: null,
        number: 800,
        title: "ZIP 321: clarify transaction encoding",
        author: "str4d",
        createdAt: "2025-09-01T00:00:00Z",
        updatedAt: "2025-10-20T00:00:00Z",
        url: "https://github.com/zcash/zips/pull/800",
        diffUrl: "https://github.com/zcash/zips/pull/800.diff",
        headRef: "zip-321-clarify",
        headRepo: "str4d/zips",
        headSha: "abcdef1234567890",
        additions: 42,
        deletions: 13,
        changedFiles: 1,
        bodyExcerpt: "Clarifies several normative sentences…",
        zipRefs: [321],
        draftRefs: [],
        mapped: true,
        claimed: false,
        files: [],
        filesTruncated: false,
        previews: [],
        preview: null,
        ...overrides,
    };
}

export function makeUpgrade(overrides: Partial<Upgrade> = {}): Upgrade {
    return {
        id: "nu6",
        name: "NU6",
        code: "nu6",
        mainnet: "2025-06-26",
        testnet: "2025-04-24",
        status: "final",
        summary: "Introduces a non-direct funding mechanism for the Zcash Community Grants lockbox and revises development-fund disbursement.",
        zips: [200, 1015],
        ...overrides,
    };
}

export function makeImpl(overrides: Partial<Implementation> = {}): Implementation {
    return {
        name: "zcashd",
        label: "zcashd",
        url: "https://github.com/zcash/zcash",
        level: "consensus",
        notes: "Reference consensus node.",
        zips: [32, 200, 244],
        ...overrides,
    };
}

export function makeProposal(overrides: Partial<NewProposal> = {}): NewProposal {
    const pr = makePr({
        number: 812,
        title: "ZIP 350: An abstraction for cross-chain transfers",
        preview: {
            filename: "zip-0350.md",
            slug: "zip-0350",
            title: "ZIP 350: An abstraction for cross-chain transfers",
            status: "Draft",
            headings: [],
            format: "md",
        },
    });
    return {
        pr,
        slug: "zip-0350",
        number: 350,
        kind: "zip",
        ...overrides,
    };
}

export const mockCommit: UpstreamMeta = {
    repo: "zcash/zips",
    commit: "0123456789abcdef0123456789abcdef01234567",
    commitShort: "01234567",
    commitUrl: "https://github.com/zcash/zips/commit/01234567",
    syncedAt: "2025-11-01T00:00:00.000Z",
};

export const mockCrossrefs: Crossrefs = {
    related: ["zip-0032", "zip-0173"],
    analogous_bips: ["BIP 32"],
    spec_sections: ["Transaction Encoding", "Address Encoding"],
};
