import type { Meta, StoryObj } from "@storybook/nextjs";
import ProposalList from "@/components/proposal-list";
import { makePr, makeProposal } from "@/lib/fixtures";

const meta: Meta<typeof ProposalList> = {
    title: "PRs/ProposalList",
    component: ProposalList,
};
export default meta;
type Story = StoryObj<typeof ProposalList>;

export const Default: Story = {
    args: {
        items: [
            makeProposal(),
            makeProposal({
                pr: makePr({
                    number: 813,
                    title: "draft-payment-incentives: new draft",
                    zipRefs: [],
                    draftRefs: ["draft-payment-incentives"],
                    preview: null,
                }),
                slug: "draft-payment-incentives",
                number: null,
                kind: "draft",
            }),
        ],
    },
};

export const Empty: Story = {
    args: { items: [] },
};
