import { cva, type VariantProps } from "class-variance-authority";
/* Two shapes, one component:
   - One line (default): a capsule. Radius is half the height (leading-4 + py-1
     + 1px border on each side = 1.5rem + 2px).
   - Wrapped (data-wrapped, set by <Badge> when the label takes more than one
     line): a small rounded card. A capsule's padding (4px top, 8px side) and
     13px corners crowd a text block, so the wrapped shape uses 10px corners,
     10px side padding, and 6px top padding + 3px half-leading, which looks the
     same as the side padding.
   text-pretty fills each wrapped line, with no short orphan line. */
export const badgeVariants = cva([
    "inline-flex max-w-full w-fit items-center gap-1 border font-mono text-xs break-words text-pretty",
    "rounded-[calc(0.75rem+1px)] px-2 py-1 leading-4",
    "data-wrapped:rounded-[0.625rem] data-wrapped:px-2.5 data-wrapped:py-1.5 data-wrapped:leading-[1.125rem]",
], {
    variants: {
        variant: {
            default: "border-transparent bg-accent text-accent-foreground",
            secondary: "border-border/60 bg-muted text-muted-foreground",
            success: "border-success/20 bg-success-soft text-success",
            warn: "border-warn/20 bg-warn-soft text-warn",
            destructive: "border-destructive/20 bg-danger-soft text-destructive",
            purple: "border-purple/20 bg-purple-soft text-purple",
            accent: "border-accent/20 bg-accent-soft text-accent",
            outline: "border-border/80 text-muted-foreground",
        },
    },
    defaultVariants: {
        variant: "secondary",
    },
});
export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
