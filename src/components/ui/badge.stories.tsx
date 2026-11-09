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
export const AllVariants: Story = {
    render: () => (<div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">ZIP 007</Badge>
      <Badge variant="secondary">Sapling</Badge>
      <Badge variant="success">Final</Badge>
      <Badge variant="warn">Draft</Badge>
      <Badge variant="destructive">Withdrawn</Badge>
      <Badge variant="purple">proposed</Badge>
      <Badge variant="accent">Active</Badge>
      <Badge variant="outline">r3</Badge>
    </div>),
};
/* A label wider than its container wraps. One-line badges stay capsules; the
   wrapped one becomes a rounded rectangle with balanced lines, not an oval. */
export const Wrapping: Story = {
    render: () => (<div className="flex flex-col gap-6">
      <div className="w-36 resize-x overflow-hidden rounded-md border border-dashed border-border p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="destructive">Withdrawn – Not Fulfilled</Badge>
          <Badge variant="outline">r3</Badge>
        </div>
      </div>
      <div className="w-44 resize-x overflow-hidden rounded-md border border-dashed border-border p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="warn">status → Withdrawn – Not Fulfilled</Badge>
          <Badge variant="accent">PR #1024</Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Drag the bottom-right corner of each box to resize.</p>
    </div>),
};
