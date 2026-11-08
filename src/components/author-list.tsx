function authorParts(a: string): {
    name: string;
    email: string | null;
} {
    const m = a.match(/^(.*?)\s*<([^>]+)>\s*$/);
    return m ? { name: m[1], email: m[2] } : { name: a, email: null };
}
export default function AuthorList({ names }: {
    names: string[];
}) {
    return (<ul className="space-y-0.5">
      {names.map((a) => {
            const p = authorParts(a);
            return (<li key={a} className="min-w-0">
            {p.name}
            {p.email && (<span className="block font-mono text-[0.6875rem] text-faint">{p.email}</span>)}
          </li>);
        })}
    </ul>);
}
