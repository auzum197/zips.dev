import type { Meta, StoryObj } from "@storybook/nextjs";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";

const meta: Meta<typeof Table> = {
    title: "UI/Table",
    component: Table,
};
export default meta;
type Story = StoryObj<typeof Table>;

const rows = [
    { n: 32, title: "Provisions for a lightweight client", status: "Final", cat: "Consensus" },
    { n: 111, title: "Comparison of Zcash Forward and Zcash Classic", status: "Obsolete", cat: "Process" },
    { n: 321, title: "Unified Addresses and Unified Viewing Keys", status: "Proposed", cat: "Wallet" },
];

export const Default: Story = {
    render: () => (<Table className="max-w-2xl">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">ZIP</TableHead>
          <TableHead scope="col">Title</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col">Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (<TableRow key={r.n}>
            <TableCell className="whitespace-nowrap font-mono text-muted-foreground">{r.n}</TableCell>
            <TableCell>{r.title}</TableCell>
            <TableCell><StatusBadge status={r.status}/></TableCell>
            <TableCell className="text-muted-foreground">{r.cat}</TableCell>
          </TableRow>))}
      </TableBody>
      <TableCaption>Three sample ZIPs.</TableCaption>
    </Table>),
};
