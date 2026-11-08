import type { Meta, StoryObj } from "@storybook/nextjs";
import { Input } from "@/components/ui/input";

const meta: Meta<typeof Input> = {
    title: "UI/Input",
    component: Input,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: { placeholder: "Filter by number, title, or category…", "aria-label": "Filter ZIPs" },
};
export const Search: Story = {
    args: { type: "search", placeholder: "Search ZIPs…", "aria-label": "Search ZIPs", className: "max-w-sm" },
};
export const Disabled: Story = {
    args: { placeholder: "Disabled", disabled: true },
};
