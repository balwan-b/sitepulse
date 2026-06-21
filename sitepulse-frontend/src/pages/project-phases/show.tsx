import { useNavigation, useOne, useResourceParams } from "@refinedev/core";

import { ShowView, ShowViewHeader } from "@/components/refine-ui/views/show-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectPhaseRecord } from "@/types";

const fieldValue = (value: string | number | null | undefined) =>
  value == null || value === "" ? "Not set" : value;

export default function ProjectPhasesShowPage() {
  const { id } = useResourceParams();
  const { show } = useNavigation();

  const phaseQuery = useOne<ProjectPhaseRecord>({
    resource: "project-phases",
    id: id ?? "",
    queryOptions: {
      enabled: Boolean(id),
    },
  });

  const phase = phaseQuery.result;

  return (
    <ShowView>
      <ShowViewHeader
        resource="project-phases"
        title={phase ? `${phase.sequence}. ${phase.name}` : "Project phase"}
      />
      <Card>
        <CardHeader>
          <CardTitle>Phase details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {[
            ["Project", phase?.projectName],
            ["Project code", phase?.projectCode],
            ["Sequence", phase?.sequence],
            ["Status", phase?.status?.replaceAll("_", " ")],
            [
              "Created",
              phase?.createdAt
                ? new Date(phase.createdAt).toLocaleString()
                : null,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">{fieldValue(value)}</p>
            </div>
          ))}

          {phase?.projectId ? (
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => show("projects", phase.projectId)}
              >
                Open project
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ShowView>
  );
}
