export default function PlainList({ items }: {
    items: string[];
}) {
    return (<ul className="space-y-0.5">
      {items.map((s) => (<li key={s} className="min-w-0">
          {s}
        </li>))}
    </ul>);
}
