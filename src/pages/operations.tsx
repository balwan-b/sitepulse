import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations Workspace</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This area is reserved for staff roles. Phase 2 will attach projects, phases,
        and crew assignment resources here.
      </CardContent>
    </Card>
  );
}
