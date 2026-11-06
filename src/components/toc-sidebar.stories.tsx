import type { Meta, StoryObj } from "@storybook/nextjs";
import TocSidebar from "@/components/toc-sidebar";
import type { ZipHeading } from "@/lib/types";

const meta: Meta<typeof TocSidebar> = {
    title: "ZIPs/TocSidebar",
    component: TocSidebar,
    parameters: { viewport: { defaultViewport: "page-wide" } },
};
export default meta;
type Story = StoryObj<typeof TocSidebar>;

const headings: ZipHeading[] = [
    { level: 2, id: "abstract", text: "Abstract" },
    { level: 2, id: "motivation", text: "Motivation" },
    { level: 3, id: "requirements", text: "Requirements" },
    { level: 2, id: "specification", text: "Specification" },
];

/** Absolutely-positioned page sidebar — wrapped here to keep it visible. */
export const Default: Story = {
    render: () => (<div className="relative mx-auto min-h-[40rem] max-w-[88rem] pt-6">
      <TocSidebar headings={headings}/>
      <div className="ml-0 min-[70rem]:ml-72">
        {headings.map((h) => (<section key={h.id} id={h.id} className="py-10">
            <h2 className="text-xl font-semibold">{h.text}</h2>
            <p className="mt-2 max-w-[36rem] text-sm text-muted-foreground">
              The sidebar fades out on hover so the article gets full width; the
              small list button brings it back. On narrow windows it is hidden.
            </p>
          </section>))}
      </div>
    </div>),
};

/** Forced visible at any canvas width — the production sidebar hides below 70rem. */
export const AlwaysVisible: Story = {
    render: () => (<div className="relative mx-auto min-h-[40rem] max-w-[88rem] pt-6">
      <TocSidebar headings={headings} className="block!"/>
      <div className="ml-72">
        {headings.map((h) => (<section key={h.id} id={h.id} className="py-10">
            <h2 className="text-xl font-semibold">{h.text}</h2>
          </section>))}
      </div>
    </div>),
};
