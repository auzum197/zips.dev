import type { Meta, StoryObj } from "@storybook/nextjs";
import CommandPalette, { CommandPaletteTrigger } from "@/components/command-palette";
import { openCommandPalette } from "@/lib/command-palette";
import type { PagefindResultData } from "@/lib/pagefind";

const meta: Meta<typeof CommandPalette> = {
    title: "Search/CommandPalette",
    component: CommandPalette,
    parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof CommandPalette>;

const TEXT: PagefindResultData[] = [
    {
        url: "/zip/321/",
        excerpt: "…payment URI encoding for <mark>transactions</mark>…",
        meta: { title: "ZIP 321: Payment Request URIs" },
    },
];

/** The button opens the palette with its entry motion; ⌘K opens it at once. */
export const Default: Story = {
    render: () => {
        window.pagefind = { search: async () => ({ results: TEXT.map((r) => ({ data: async () => r })) }) };
        return (<div className="p-5">
            <CommandPaletteTrigger />
            <CommandPalette />
          </div>);
    },
};

export const Open: Story = {
    render: () => {
        window.pagefind = { search: async () => ({ results: TEXT.map((r) => ({ data: async () => r })) }) };
        openCommandPalette({ instant: true });
        return <CommandPalette />;
    },
};
