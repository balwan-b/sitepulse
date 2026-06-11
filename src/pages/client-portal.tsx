import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientPortalPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This placeholder holds the restricted client-facing experience. Approved
        visibility and curated project summaries arrive in the next phase.
      </CardContent>
    </Card>
  );
}
