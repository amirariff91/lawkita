import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AboutSectionProps {
  bio: string | null;
}

export function AboutSection({ bio }: AboutSectionProps) {
  if (!bio) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">{bio}</p>
      </CardContent>
    </Card>
  );
}
