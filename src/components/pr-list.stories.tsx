import type { Meta, StoryObj } from "@storybook/nextjs";
import PrList from "@/components/pr-list";
import { makePr } from "@/lib/fixtures";

const meta: Meta<typeof PrList> = {
    title: "PRs/PrList",
    component: PrList,
};
export default meta;
type Story = StoryObj<typeof PrList>;

export const Default: Story = {
    args: {
        prs: [
            makePr(),
            makePr({
                number: 801,
                title: "ZIP 2000: an unknown ZIP number (renders faint)",
                zipRefs: [2000],
                draftRefs: [],
                claimed: true,
                updatedAt: "2025-10-01T00:00:00Z",
            }),
            makePr({
                number: 802,
                title: "draft-crosschain: new draft",
                zipRefs: [],
                draftRefs: ["draft-crosschain"],
                preview: {
                    filename: "draft-crosschain.md",
                    title: "Draft: crosschain",
                    status: "Draft",
                    headings: [],
                    format: "md",
                },
                updatedAt: "2025-09-15T00:00:00Z",
            }),
        ],
        existingZipNumbers: [321],
    },
};

export const Empty: Story = {
    args: { prs: [] },
};
