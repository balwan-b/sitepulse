import type { ColumnDef } from "@tanstack/react-table";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import type { SiteUserRecord } from "@/types";

export default function StaffListPage() {
  const columns: ColumnDef<SiteUserRecord>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {String(getValue()).replaceAll("_", " ")}
        </Badge>
      ),
    },
  ];

  const table = useTable<SiteUserRecord>({
    columns,
    refineCoreProps: {
      resource: "users",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader resource="users" canCreate={false} title="Staff directory" />
      <DataTable table={table} />
    </ListView>
  );
}
