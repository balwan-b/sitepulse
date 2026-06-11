import type { ColumnDef } from "@tanstack/react-table";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import type { ProjectRecord } from "@/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export default function ProjectsListPage() {
  const columns: ColumnDef<ProjectRecord>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Project",
    },
    {
      accessorKey: "clientName",
      header: "Client",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {String(getValue()).replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "contractValue",
      header: "Contract",
      cell: ({ getValue }) => formatCurrency(Number(getValue())),
    },
    {
      accessorKey: "projectManagerName",
      header: "Manager",
      cell: ({ row }) => row.original.projectManagerName ?? "Unassigned",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ShowButton resource="projects" recordItemId={row.original.id} />
      ),
    },
  ];

  const table = useTable<ProjectRecord>({
    columns,
    refineCoreProps: {
      resource: "projects",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader resource="projects" />
      <DataTable table={table} />
    </ListView>
  );
}
