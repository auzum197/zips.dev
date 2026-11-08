import type { Meta, StoryObj } from "@storybook/nextjs";
import ThemeToggle from "@/components/theme-toggle";

const meta: Meta<typeof ThemeToggle> = {
    title: "Site/ThemeToggle",
    component: ThemeToggle,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
