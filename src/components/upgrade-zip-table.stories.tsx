import type { Meta, StoryObj } from "@storybook/nextjs";
import UpgradeZipTable from "@/components/upgrade-zip-table";
import { makeZip } from "@/lib/fixtures";

const meta: Meta<typeof UpgradeZipTable> = {
    title: "Upgrades/UpgradeZipTable",
    component: UpgradeZipTable,
};
export default meta;
type Story = StoryObj<typeof UpgradeZipTable>;

export const Default: Story = {
    args: {
        zips: [
            makeZip({ slug: "zip-0200", number: 200, displayNumber: "200", title: "Network Upgrade Mechanism", status: "Final", category: "Network" }),
            makeZip({ slug: "zip-1015", number: 1015, displayNumber: "1015", title: "Community Grants Lockbox Funding", status: "Final", category: "Consensus" }),
            makeZip({ slug: "zip-1101", number: 1101, displayNumber: "1101", title: "Proposed Change to Funding Amount", status: "Proposed", category: "Economics" }),
        ],
    },
};
