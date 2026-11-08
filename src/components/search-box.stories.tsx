import type { Meta, StoryObj } from "@storybook/nextjs";
import SearchBox from "@/components/search-box";
import type { PagefindResultData } from "@/components/search-box";

const meta: Meta<typeof SearchBox> = {
    title: "Search/SearchBox",
    component: SearchBox,
};
export default meta;
type Story = StoryObj<typeof SearchBox>;

function mockPagefind(results: PagefindResultData[]) {
    return {
        search: async () => ({
            results: results.map((r) => ({ data: async () => r })),
        }),
    };
}

/** Live search box. Without a built Pagefind index it shows the "index not found" notice. */
export const Default: Story = {};

export const WithResults: Story = {
    render: () => {
        window.pagefind = mockPagefind([
            {
                url: "/zip/32/",
                excerpt: "…<mark>transactions</mark> that pay to a shielded…",
                meta: { title: "ZIP 32: Shielded hierarchical deterministic wallets" },
            },
            {
                url: "/zip/321/",
                excerpt: "…payment URI encoding for <mark>transactions</mark>…",
                meta: { title: "ZIP 321: Payment URI Format" },
            },
        ]);
        return <SearchBox />;
    },
};

export const NoResults: Story = {
    render: () => {
        window.pagefind = mockPagefind([]);
        return <SearchBox />;
    },
};
