import type { Meta, StoryObj } from "@storybook/nextjs";
import UpgradeTimeline from "@/components/upgrade-timeline";
import { makeUpgrade } from "@/lib/fixtures";

const meta: Meta<typeof UpgradeTimeline> = {
    title: "Upgrades/UpgradeTimeline",
    component: UpgradeTimeline,
};
export default meta;
type Story = StoryObj<typeof UpgradeTimeline>;

export const Default: Story = {
    args: {
        upgrades: [
            makeUpgrade({
                id: "overwinter",
                name: "Overwinter",
                code: "overwinter",
                mainnet: "2018-02-28",
                testnet: "2018-01-20",
                summary: "The first network upgrade — transaction expiry and improved replay protection.",
                zips: [200, 201, 202],
            }),
            makeUpgrade({
                id: "sapling",
                name: "Sapling",
                code: "sapling",
                mainnet: "2018-10-28",
                testnet: "2018-09-12",
                summary: "Brought privacy to light-client users with much cheaper shielded transactions.",
                zips: [200, 201, 221, 243],
            }),
            makeUpgrade({
                id: "nu6",
                name: "NU6",
                code: "nu6",
                status: "final",
                summary: "Introduces a non-direct funding mechanism for the Zcash Community Grants lockbox.",
                zips: [200, 1015],
            }),
            makeUpgrade({
                id: "nu7",
                name: "NU7",
                code: "nu7",
                status: "proposed",
                mainnet: undefined,
                testnet: undefined,
                summary: "Proposed next upgrade — contents not yet finalized.",
                zips: [],
            }),
        ],
    },
};
