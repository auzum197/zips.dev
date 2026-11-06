import type { Meta, StoryObj } from "@storybook/nextjs";
import MatrixFilter from "@/components/matrix-filter";
import Link from "next/link";

const meta: Meta<typeof MatrixFilter> = {
    title: "Matrix/MatrixFilter",
    component: MatrixFilter,
};
export default meta;
type Story = StoryObj<typeof MatrixFilter>;

/** Needs a `#mtx-table` in the document — the component filters its rows by `data-q`. */
export const WithTable: Story = {
    render: () => (<div className="space-y-3">
      <MatrixFilter total={3}/>
      <table className="w-full max-w-2xl border-collapse text-sm" id="mtx-table">
        <tbody>
          {[
            { n: 32, title: "Shielded hierarchical deterministic wallets", hit: false },
            { n: 200, title: "Network Upgrade Mechanism", hit: false },
            { n: 321, title: "Unified Addresses and Unified Viewing Keys", hit: false },
          ].map((r) => (<tr key={r.n} data-q={`${r.n} ${r.title}`.toLowerCase()} className="border-b border-border-subtle py-2">
              <td className="px-2 py-1.5 font-mono text-muted-foreground">
                <Link href={`/zip/${r.n}/`}>{r.n}</Link>
              </td>
              <td className="px-2 py-1.5">{r.title}</td>
            </tr>))}
        </tbody>
      </table>
    </div>),
};
