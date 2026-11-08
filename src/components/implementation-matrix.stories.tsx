import type { Meta, StoryObj } from "@storybook/nextjs";
import ImplementationMatrix from "@/components/implementation-matrix";
import { makeImpl, makeZip } from "@/lib/fixtures";
import type { Implementation, ZipMeta } from "@/lib/types";

const meta: Meta<typeof ImplementationMatrix> = {
    title: "Matrix/ImplementationMatrix",
    component: ImplementationMatrix,
};
export default meta;
type Story = StoryObj<typeof ImplementationMatrix>;

const impls: Implementation[] = [
    makeImpl(),
    makeImpl({
        name: "zebra",
        label: "zebra",
        level: "consensus",
        notes: "Rust consensus node maintained by the Zcash Foundation.",
        zips: [32, 200],
    }),
    makeImpl({
        name: "zcash-sdk",
        label: "Zcash SDK",
        level: "sdk",
        notes: "Rust SDK for mobile wallets.",
        zips: [32, 321],
    }),
    makeImpl({
        name: "ec wallet",
        label: "EC Wallet",
        level: "wallet",
        notes: "Reference mobile wallet.",
        zips: [321],
    }),
    makeImpl({
        name: "lightwalletd",
        label: "lightwalletd",
        level: "infrastructure",
        notes: "Middleware service for light clients.",
        zips: [200],
    }),
];

const zips: ZipMeta[] = [
    makeZip({ slug: "zip-0032", number: 32, displayNumber: "32", title: "Shielded hierarchical deterministic wallets", filename: "zip-0032.md", category: "Wallet" }),
    makeZip({ slug: "zip-0200", number: 200, displayNumber: "200", title: "Network Upgrade Mechanism", filename: "zip-0200.md", category: "Network" }),
    makeZip({ slug: "zip-0321", number: 321, displayNumber: "321", title: "Unified Addresses and Unified Viewing Keys", filename: "zip-0321.md", category: "Wallet" }),
];

export const Default: Story = {
    args: { impls, zips },
};
