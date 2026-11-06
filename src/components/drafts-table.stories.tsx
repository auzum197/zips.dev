import type { Meta, StoryObj } from "@storybook/nextjs";
import DraftsTable from "@/components/drafts-table";
import { makeZip } from "@/lib/fixtures";

const meta: Meta<typeof DraftsTable> = {
    title: "Index/DraftsTable",
    component: DraftsTable,
};
export default meta;
type Story = StoryObj<typeof DraftsTable>;

export const Default: Story = {
    args: {
        drafts: [
            makeZip({
                slug: "draft-crosschain",
                number: null,
                displayNumber: "draft-crosschain",
                kind: "draft",
                title: "Trustless ZEC Transfers between Chains",
                status: "Draft",
                category: "Crosschain",
                created: "2025-08-14",
            }),
            makeZip({
                slug: "draft-payment-incentives",
                number: null,
                displayNumber: "draft-payment-incentives",
                kind: "draft",
                title: "Payment Incentives for Zcash",
                status: "Proposed",
                category: "Economics",
                created: "2025-09-02",
            }),
        ],
    },
};
