import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Button> = {
    title: "UI/Button",
    component: Button,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: { children: "Button" },
};
export const Outline: Story = {
    args: { children: "Final", variant: "outline", size: "sm", className: "rounded-full font-mono" },
};
export const Ghost: Story = {
    args: { children: "Zen", variant: "ghost", size: "sm" },
};
export const Link: Story = {
    args: { children: "Reset", variant: "ghost", size: "sm", className: "text-destructive underline underline-offset-2" },
};
export const Icon: Story = {
    args: { children: "☾", variant: "ghost", size: "icon", "aria-label": "Switch theme" },
};
export const Disabled: Story = {
    args: { children: "Disabled", disabled: true },
};
