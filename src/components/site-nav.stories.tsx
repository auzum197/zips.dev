import type { Meta, StoryObj } from "@storybook/nextjs";
import SiteNav from "@/components/site-nav";

const meta: Meta<typeof SiteNav> = {
    title: "Site/SiteNav",
    component: SiteNav,
};
export default meta;
type Story = StoryObj<typeof SiteNav>;

export const Default: Story = {};
