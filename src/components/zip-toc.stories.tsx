import type { Meta, StoryObj } from "@storybook/nextjs";
import ZipToc from "@/components/zip-toc";
import type { ZipHeading } from "@/lib/types";

const meta: Meta<typeof ZipToc> = {
    title: "ZIPs/TableOfContents",
    component: ZipToc,
};
export default meta;
type Story = StoryObj<typeof ZipToc>;

const headings: ZipHeading[] = [
    { level: 2, id: "abstract", text: "Abstract" },
    { level: 2, id: "motivation", text: "Motivation" },
    { level: 3, id: "requirements", text: "Requirements" },
    { level: 4, id: "privacy", text: "Privacy considerations" },
    { level: 2, id: "specification", text: "Specification" },
    { level: 3, id: "encoding", text: "Address encoding" },
];

/** Rendered next to matching heading elements so scroll-spy can observe them. */
export const WithScrollSpy: Story = {
    render: () => (<div className="flex gap-8">
      <div className="w-64 shrink-0">
        <ZipToc headings={headings}/>
      </div>
      <div className="max-w-[36rem]">
        {headings.map((h) => (<section key={h.id} id={h.id} className="py-8">
            <h2 className="text-xl font-semibold">{h.text}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Scroll this pane — the matching TOC entry highlights.
            </p>
          </section>))}
      </div>
    </div>),
};

export const Empty: Story = {
    args: { headings: [] },
};
