import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

export type TableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  getRowClassName,
  emptyTitle,
  emptyDescription,
}: {
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  getRowClassName?: (row: Row) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="overflow-hidden rounded-b-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  className={`whitespace-nowrap px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 ${column.className ?? ""}`}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className={`border-t transition-colors ${getRowClassName?.(row) ?? ""}`}
                key={getRowKey(row)}
              >
                {columns.map((column) => (
                  <td
                    className={`px-5 py-3.5 text-sm ${column.className ?? ""}`}
                    key={column.key}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
