import type { Meta, StoryObj } from "@storybook/nextjs";
import ZenToggle from "@/components/zen-toggle";

const meta: Meta<typeof ZenToggle> = {
    title: "Site/ZenToggle",
    component: ZenToggle,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof ZenToggle>;

export const Default: Story = {};
