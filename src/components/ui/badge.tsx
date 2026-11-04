import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs leading-5 whitespace-nowrap w-fit", {
    variants: {
        variant: {
            default: "border-transparent bg-accent text-accent-foreground",
            secondary: "border-border bg-muted text-muted-foreground",
            success: "border-success bg-success-soft text-success",
            warn: "border-warn bg-warn-soft text-warn",
            destructive: "border-destructive bg-danger-soft text-destructive",
            purple: "border-purple bg-purple-soft text-purple",
            accent: "border-accent bg-accent-soft text-accent",
            outline: "border-border text-muted-foreground",
        },
    },
    defaultVariants: {
        variant: "secondary",
    },
});
function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return (<span className={cn(badgeVariants({ variant }), className)} {...props}/>);
}
export { Badge, badgeVariants };
