import { cn } from "@/lib/utils";
export default function DateRow({ label, value, }: {
    label: string;
    value: string | null;
}) {
    return (<span className="whitespace-nowrap">
      {label}{" "}
      <span className={cn("font-mono", value ? "text-foreground" : "text-faint")}>
        {value ?? "—"}
      </span>
    </span>);
}
