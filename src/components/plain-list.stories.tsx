import type { Meta, StoryObj } from "@storybook/nextjs";
import PlainList from "@/components/plain-list";

const meta: Meta<typeof PlainList> = {
    title: "ZIPs/PlainList",
    component: PlainList,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof PlainList>;

export const Default: Story = {
    args: {
        items: ["Jack Grigg", "Sean Bowe", "Zcash Foundation"],
    },
};
