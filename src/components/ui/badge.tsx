"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeVariantProps } from "@/components/ui/badge-variants";
/* CSS cannot tell if a box wrapped, so measure it: when the label takes more
   than one line, set data-wrapped and the badge changes from a capsule to a
   rounded card (see badge-variants.ts). The wrapped shape only adds padding,
   so it cannot cause the label to fit on one line again: no flip-flop. */
function useWrapped(ref: React.RefObject<HTMLElement | null>) {
    const [wrapped, setWrapped] = React.useState(false);
    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const measure = () => {
            const cs = getComputedStyle(el);
            const content = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            setWrapped(content > parseFloat(cs.lineHeight) * 1.5);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return wrapped;
}
function Badge({ className, variant, ref, ...props }: React.ComponentProps<"span"> & BadgeVariantProps) {
    const local = React.useRef<HTMLSpanElement>(null);
    const wrapped = useWrapped(local);
    const setRef = React.useCallback((node: HTMLSpanElement | null) => {
        local.current = node;
        if (typeof ref === "function")
            ref(node);
        else if (ref)
            ref.current = node;
    }, [ref]);
    return (<span ref={setRef} data-wrapped={wrapped || undefined} className={cn(badgeVariants({ variant }), className)} {...props}/>);
}
export { Badge };
