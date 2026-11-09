import type { Meta, StoryObj } from "@storybook/nextjs";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
export const PerRevision: Story = {
    args: { status: "[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed" },
};
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

/* Real per-revision statuses, verbatim from the upstream ZIP headers (ZIPs
   207, 214, 316, 317). Each entry shows as its own short badge. */
const LONG_STATUSES = [
    "[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed",
    "[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU6.1] Proposed, [Revision 3: NU7] Proposed",
    "[Revision 0] Active, [Revision 1] Withdrawn, [Revision 2] Draft",
    "[Revision 0] Active, [Revision 1: NU6.3] Active, [Revision 2] Proposed",
];
const frame = "rounded-md border border-dashed border-border p-3";
const caption = "mb-2 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint";

export const RevisionStatusesInContext: Story = {
    parameters: { layout: "padded" },
    render: () => (<div className="flex flex-wrap items-start gap-8 text-[0.8125rem] text-muted-foreground">
      <section>
        <p className={caption}>Meta panel · 18rem</p>
        <div className={`w-72 space-y-3 ${frame}`}>
          {LONG_STATUSES.map((s) => (<div key={s}>
              <StatusBadge status={s}/>
            </div>))}
        </div>
      </section>

      <section>
        <p className={caption}>ZIP header · phone (22.5rem)</p>
        <div className={`w-[22.5rem] space-y-4 ${frame}`}>
          {LONG_STATUSES.slice(0, 2).map((s) => (<div key={s} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusBadge status={s}/>
              <span>by Daira-Emma Hopwood · updated 2025-06-01</span>
            </div>))}
        </div>
      </section>

      <section className="w-full max-w-[40rem]">
        <p className={caption}>Index table</p>
        <div className={frame}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ZIP</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[[207, "Funding Streams"], [214, "Consensus rules for a Zcash Development Fund"], [316, "Unified Addresses"], [317, "Proportional Transfer Fee Mechanism"], [32, "Shielded hierarchical deterministic wallets"]].map(([n, t], i) => (<TableRow key={n}>
                  <TableCell className="font-mono">{n}</TableCell>
                  <TableCell className="text-foreground">{t}</TableCell>
                  <TableCell>
                    <StatusBadge status={LONG_STATUSES[i] ?? "Final"}/>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>),
};
