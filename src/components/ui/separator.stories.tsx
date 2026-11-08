import type { Meta, StoryObj } from "@storybook/nextjs";
import { Separator } from "@/components/ui/separator";

const meta: Meta<typeof Separator> = {
    title: "UI/Separator",
    component: Separator,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
    render: () => (<div className="w-80 space-y-3">
      <p className="text-sm">Above the line</p>
      <Separator />
      <p className="text-sm">Below the line</p>
    </div>),
};
export const Vertical: Story = {
    render: () => (<div className="flex h-8 items-center gap-3">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Right</span>
    </div>),
};
