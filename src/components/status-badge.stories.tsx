import type { Meta, StoryObj } from "@storybook/nextjs";
import StatusBadge from "@/components/status-badge";

const meta: Meta<typeof StatusBadge> = {
    title: "ZIPs/StatusBadge",
    component: StatusBadge,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Final: Story = { args: { status: "Final" } };
export const Proposed: Story = { args: { status: "Proposed" } };
export const Draft: Story = { args: { status: "Draft" } };
export const Reserved: Story = { args: { status: "Reserved" } };
export const Obsolete: Story = { args: { status: "Obsolete" } };
export const Withdrawn: Story = { args: { status: "Withdrawn – Not Fulfilled" } };
export const Active: Story = { args: { status: "Active" } };
export const Unknown: Story = { args: { status: "Something Else" } };
export const AllGroups: Story = {
    render: () => (<div className="flex flex-wrap gap-2">
      <StatusBadge status="Final"/>
      <StatusBadge status="Proposed"/>
      <StatusBadge status="Draft"/>
      <StatusBadge status="Reserved"/>
      <StatusBadge status="Active"/>
      <StatusBadge status="Obsolete"/>
      <StatusBadge status="Withdrawn – Not Fulfilled"/>
      <StatusBadge status="Something Else"/>
    </div>),
};
