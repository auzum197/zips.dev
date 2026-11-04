import Link from "next/link";
export default function NotFound() {
    return (<div className="py-20 text-center">
      <p className="font-mono text-5xl text-faint">404</p>
      <p className="mt-3 text-muted-foreground">No such page.</p>
      <p className="mt-4 text-sm">
        Try the{" "}
        <Link href="/" className="text-accent hover:underline">
          ZIP index
        </Link>{" "}
        or{" "}
        <Link href="/search/" className="text-accent hover:underline">
          search
        </Link>
        .
      </p>
    </div>);
}
