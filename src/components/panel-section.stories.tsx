import type { Meta, StoryObj } from "@storybook/nextjs";
import PanelSection from "@/components/panel-section";

const meta: Meta<typeof PanelSection> = {
    title: "ZIPs/PanelSection",
    component: PanelSection,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof PanelSection>;

export const Default: Story = {
    args: {
        title: "License",
        children: <p className="m-0">MIT</p>,
    },
};
