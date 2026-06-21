import type { ColumnDef } from "@tanstack/react-table";
import { useTable } from "@refinedev/react-table";

import { ShowButton } from "@/components/refine-ui/buttons/show";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const phases = table.refineCore.result.data ?? [];
  const activeCount = phases.filter((phase: ProjectPhaseRecord) => phase.status === "active").length;
  const blockedCount = phases.filter((phase: ProjectPhaseRecord) => phase.status === "blocked").length;

  return (
    <ListView>
      <ListViewHeader resource="project-phases" />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Phases on page"
          value={phases.length}
          note={`${activeCount} active and ${blockedCount} blocked`}
        />
        <SummaryCard
          label="Project coverage"
          value={new Set(phases.map((phase: ProjectPhaseRecord) => phase.projectId)).size}
          note="Visible projects represented in this phase list"
        />
        <SummaryCard
          label="Ready next"
          value={phases.filter((phase: ProjectPhaseRecord) => phase.status === "not_started").length}
          note="Not started phases waiting to be mobilized"
        />
      </section>
      <DataTable table={table} />
    </ListView>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
