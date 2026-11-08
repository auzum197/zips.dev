import type { Meta, StoryObj } from "@storybook/nextjs";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
    title: "UI/Badge",
    component: Badge,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: { children: "ZIP 007", variant: "default" },
};
export const Secondary: Story = {
    args: { children: "Sapling", variant: "secondary" },
};
export const Success: Story = {
    args: { children: "Final", variant: "success" },
};
export const Warn: Story = {
    args: { children: "Draft", variant: "warn" },
};
export const Destructive: Story = {
    args: { children: "Withdrawn", variant: "destructive" },
};
export const Purple: Story = {
    args: { children: "proposed", variant: "purple" },
};
export const Accent: Story = {
    args: { children: "Active", variant: "accent" },
};
export const Outline: Story = {
    args: { children: "r3", variant: "outline" },
};
