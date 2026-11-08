import type { Meta, StoryObj } from "@storybook/nextjs";
import PageHeader from "@/components/page-header";

const meta: Meta<typeof PageHeader> = {
    title: "Layout/PageHeader",
    component: PageHeader,
};
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const TitleOnly: Story = {
    args: { title: "ZIPs" },
};
export const WithIntro: Story = {
    args: {
        title: "Network Upgrades",
        intro: "Consensus changes deployed to the Zcash chain, and the ZIPs that specify them.",
    },
};
export const WithLinkInIntro: Story = {
    args: {
        title: "ZIPs",
        intro: (<>
        78 numbered · 12 drafts ·{" "}
        <a href="#top">zcash/zips@01234567</a>
      </>),
    },
};
