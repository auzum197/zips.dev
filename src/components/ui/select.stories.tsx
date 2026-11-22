import type { Meta, StoryObj } from "@storybook/nextjs";
import { Select } from "@/components/ui/select";

const meta: Meta<typeof Select> = {
    title: "UI/Select",
    component: Select,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Select>;

const options = (<>
    <option value="all">All categories</option>
    <option value="consensus">Consensus</option>
    <option value="wallet">Standards / Wallet</option>
  </>);

export const Placeholder: Story = {
    args: { "aria-label": "Filter by category", placeholder: true, defaultValue: "all", children: options },
};
export const WithValue: Story = {
    args: { "aria-label": "Filter by category", defaultValue: "wallet", children: options },
};
export const Disabled: Story = {
    args: { "aria-label": "Filter by category", placeholder: true, disabled: true, children: options },
};
