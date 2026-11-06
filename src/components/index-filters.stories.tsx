import type { Meta, StoryObj } from "@storybook/nextjs";
import IndexFilters, { type IndexRow } from "@/components/index-filters";

const meta: Meta<typeof IndexFilters> = {
    title: "Index/IndexFilters",
    component: IndexFilters,
};
export default meta;
type Story = StoryObj<typeof IndexFilters>;

const rows: IndexRow[] = [
    { number: 32, title: "Shielded hierarchical deterministic wallets", status: "Final", group: "final", category: "Wallet", year: 2018, upgrades: ["Sapling"] },
    { number: 173, title: "Deprecation of the Canopy Network Upgrade", status: "Withdrawn – Not Fulfilled", group: "withdrawn", category: "Network", year: 2020, upgrades: [] },
    { number: 200, title: "Network Upgrade Mechanism", status: "Final", group: "final", category: "Network", year: 2017, upgrades: ["Overwinter", "Sapling", "Blossom", "Heartwood", "Canopy", "NU5"] },
    { number: 321, title: "Unified Addresses and Unified Viewing Keys", status: "Proposed", group: "proposed", category: "Wallet", year: 2022, upgrades: ["NU5"] },
    { number: 421, title: "Trustless ZEC Transfers between Chains", status: "Reserved", group: "reserved", category: "Crosschain", year: 2024, upgrades: [] },
    { number: 1015, title: "Community Grants Lockbox Funding", status: "Final", group: "final", category: "Consensus", year: 2024, upgrades: ["NU6"] },
];

export const Default: Story = {
    args: { rows },
};

export const EmptyResult: Story = {
    render: () => (<IndexFilters rows={[{ ...rows[0], title: "zzz-no-match" }]}/>),
};
