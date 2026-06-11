import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations Workspace</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This area is reserved for staff roles. Phase 2 resources now live in the
        Projects, Project Phases, Crew Assignments, and Staff Directory sections.
      </CardContent>
    </Card>
  );
}
