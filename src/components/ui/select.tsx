"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
/* A native <select> with the box of <Input>: same height, radius, border,
   padding and focus ring. The browser arrow is replaced by the chevron of the
   language menu, at the same 12px inset as the text.
   `data-placeholder` marks the neutral value ("All …"): it shows in the
   placeholder colour, so a select with a filter set reads like an input with
   text in it. `className` goes to the wrapper (layout), not to the control.
   Focus: the accent ring is for the keyboard only. Browsers keep
   :focus-visible on a select after a click, so `data-pointer` marks focus
   that came from the pointer; it shows a darker border and no ring. */
function Select({ className, children, placeholder, onPointerDown, onBlur, ...props }: React.ComponentProps<"select"> & {
    placeholder?: boolean;
}) {
    return (<span className={cn("relative inline-flex min-w-0 max-w-56", className)}>
      <select data-placeholder={placeholder || undefined} className="h-9 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border border-input bg-transparent py-1 pl-3 pr-8 text-sm transition-colors focus-visible:outline-none focus-visible:border-muted-foreground focus-visible:not-data-pointer:border-input focus-visible:not-data-pointer:ring-2 focus-visible:not-data-pointer:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-faint dark:[color-scheme:dark]" {...props} onPointerDown={(e) => {
        e.currentTarget.dataset.pointer = "";
        onPointerDown?.(e);
    }} onBlur={(e) => {
        delete e.currentTarget.dataset.pointer;
        onBlur?.(e);
    }}>
        {children}
      </select>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" aria-hidden>
        <path d="M4 6l4 4 4-4"/>
      </svg>
    </span>);
}
export { Select };
