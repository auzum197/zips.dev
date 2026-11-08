import type { Meta, StoryObj } from "@storybook/nextjs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";

const meta: Meta<typeof Card> = {
    title: "UI/Card",
    component: Card,
    parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Complete: Story = {
    render: () => (<Card className="w-96">
      <CardHeader>
        <CardTitle>NU5 <Badge variant="secondary" className="align-middle font-mono">nu5</Badge></CardTitle>
        <CardDescription>Activation: 2022-05-31</CardDescription>
      </CardHeader>
      <CardContent>
        The fifth Zcash network upgrade, introducing the Orchard shielded
        protocol.
      </CardContent>
      <CardFooter>12 ZIPs</CardFooter>
    </Card>),
};
export const DeploymentRow: Story = {
    render: () => (<Card className="flex w-fit flex-wrap gap-2 p-3">
      <Badge variant="accent">ZIP 200</Badge>
      <Badge variant="accent">ZIP 230</Badge>
      <Badge variant="accent">ZIP 244</Badge>
    </Card>),
};
