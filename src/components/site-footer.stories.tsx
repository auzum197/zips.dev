import type { Meta, StoryObj } from "@storybook/nextjs";
import SiteFooter from "@/components/site-footer";
import { mockCommit } from "@/lib/fixtures";

const meta: Meta<typeof SiteFooter> = {
    title: "Site/SiteFooter",
    component: SiteFooter,
};
export default meta;
type Story = StoryObj<typeof SiteFooter>;

export const Default: Story = {
    args: { meta: mockCommit },
};
