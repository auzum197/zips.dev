import type { Meta, StoryObj } from "@storybook/nextjs";
import AuthorList from "@/components/author-list";

const meta: Meta<typeof AuthorList> = {
    title: "ZIPs/AuthorList",
    component: AuthorList,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof AuthorList>;

export const WithEmails: Story = {
    args: {
        names: [
            "Daira-Emma Hopwood <daira@zaptech.org>",
            "Jack Grigg <jack@electriccoin.co>",
            "Sean Bowe",
        ],
    },
};
