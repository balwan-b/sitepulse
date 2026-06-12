import type { ColumnDef } from "@tanstack/react-table";
import { useTable } from "@refinedev/react-table";

import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const projects = table.refineCore.result.data ?? [];
  const activeCount = projects.filter((project: ProjectRecord) => project.status === "active").length;
  const atRiskCount = projects.filter((project: ProjectRecord) => project.status === "at_risk").length;
  const contractTotal = projects.reduce(
    (sum: number, project: ProjectRecord) => sum + project.contractValue,
    0,
  );

  return (
    <ListView>
      <ListViewHeader resource="projects" />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Projects on page"
          value={projects.length}
          note={`${activeCount} active and ${atRiskCount} at risk`}
        />
        <SummaryCard
          label="Contract value"
          value={formatCurrency(contractTotal)}
          note="Visible portfolio slice in this current table view"
        />
        <SummaryCard
          label="Managed accounts"
          value={projects.filter((project: ProjectRecord) => project.projectManagerName).length}
          note="Projects with an assigned project manager"
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
