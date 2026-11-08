import type { Meta, StoryObj } from "@storybook/nextjs";
import DateRow from "@/components/date-row";

const meta: Meta<typeof DateRow> = {
    title: "Upgrades/DateRow",
    component: DateRow,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof DateRow>;

export const WithValue: Story = {
    args: { label: "Mainnet:", value: "2025-06-26" },
};
export const Missing: Story = {
    args: { label: "Testnet:", value: null },
};
export const InContext: Story = {
    render: () => (<p className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
      <DateRow label="Mainnet:" value="2025-06-26"/>
      <DateRow label="Testnet:" value="2025-04-24"/>
      <DateRow label="ACT:" value={null}/>
    </p>),
};
