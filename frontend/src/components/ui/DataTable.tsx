export function DataTable({
  columns, rows
}: {
  columns: { key: string; label: string; render?: (v: unknown, row: unknown, i: number) => React.ReactNode }[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{columns.map(c => <th key={c.key} className="px-4 py-3 text-left">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r,i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map(c => (
                <td key={c.key} className="px-4 py-2">
                  {c.render ? c.render(r[c.key], r, i) : String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


