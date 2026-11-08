import type { Meta, StoryObj } from "@storybook/nextjs";
import MetaPanel from "@/components/meta-panel";
import { makePr, makeUpgrade, makeZip, mockCommit, mockCrossrefs } from "@/lib/fixtures";

const meta: Meta<typeof MetaPanel> = {
    title: "ZIPs/MetaPanel",
    component: MetaPanel,
    parameters: { viewport: { defaultViewport: "page-wide" } },
};
export default meta;
type Story = StoryObj<typeof MetaPanel>;

const zip = makeZip();
const relatedZip = makeZip({
    slug: "zip-0032",
    number: 32,
    displayNumber: "32",
    filename: "zip-0032.md",
    title: "Shielded hierarchical deterministic wallets",
    status: "Final",
    revision: null,
});

const fullArgs = {
    zip,
    prs: [makePr()],
    upgrades: [makeUpgrade()],
    crossrefs: mockCrossrefs,
    related: [relatedZip],
    commit: mockCommit,
};

/** Absolutely positioned page sidebar — wrapped in a relative container like the real page. */
export const Full: Story = {
    render: (args) => (<div className="relative mx-auto h-[56rem] max-w-[88rem] pt-6">
      <MetaPanel {...args}/>
    </div>),
    args: fullArgs,
};

/**
 * Production panel is hidden below 73rem and in Zen mode; this variant forces
 * it visible so its content can be reviewed at any Storybook canvas width.
 */
export const AlwaysVisible: Story = {
    render: (args) => (<div className="relative mx-auto h-[56rem] max-w-[88rem] pt-6">
      <MetaPanel {...args} className="block!"/>
    </div>),
    args: fullArgs,
};

export const Minimal: Story = {
    render: (args) => (<div className="relative mx-auto h-[40rem] max-w-[88rem] pt-6">
      <MetaPanel {...args}/>
    </div>),
    args: {
        zip: makeZip({
            owners: [],
            credits: [],
            originalAuthors: [],
            created: null,
            revision: null,
            discussionsTo: null,
            headings: [],
        }),
        prs: [],
        crossrefs: null,
        commit: mockCommit,
    },
};
