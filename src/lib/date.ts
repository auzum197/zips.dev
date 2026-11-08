export function dateSlice(value: string | Date | undefined | null): string | null {
    if (value === undefined || value === null)
        return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
