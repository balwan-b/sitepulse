import type { ColumnDef } from "@tanstack/react-table";
import { useTable } from "@refinedev/react-table";

import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import type { ProjectPhaseRecord } from "@/types";

export default function ProjectPhasesListPage() {
  const columns: ColumnDef<ProjectPhaseRecord>[] = [
    {
      accessorKey: "projectCode",
      header: "Project",
    },
    {
      accessorKey: "sequence",
      header: "Sequence",
    },
    {
      accessorKey: "name",
      header: "Phase",
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
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ShowButton resource="project-phases" recordItemId={row.original.id} />
      ),
    },
  ];

  const table = useTable<ProjectPhaseRecord>({
    columns,
    refineCoreProps: {
      resource: "project-phases",
      pagination: {
        currentPage: 1,
        pageSize: 10,
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader resource="project-phases" />
      <DataTable table={table} />
    </ListView>
  );
}
