import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Award } from "lucide-react";

interface EducationSectionProps {
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    graduationYear: number | null;
  }[];
  qualifications: {
    id: string;
    title: string;
    issuingBody: string | null;
    issuedAt: Date | null;
  }[];
}

export function EducationSection({
  education,
  qualifications,
}: EducationSectionProps) {
  if (education.length === 0 && qualifications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Education & Qualifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Education */}
        {education.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="size-4" aria-hidden="true" />
              Education
            </h4>
            <div className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id} className="border-l-2 border-muted pl-4">
                  <p className="font-medium">{edu.degree}</p>
                  {edu.field && (
                    <p className="text-sm text-muted-foreground">{edu.field}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {edu.institution}
                    {edu.graduationYear && ` • ${edu.graduationYear}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qualifications */}
        {qualifications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Award className="size-4" aria-hidden="true" />
              Professional Qualifications
            </h4>
            <div className="space-y-4">
              {qualifications.map((qual) => (
                <div key={qual.id} className="border-l-2 border-muted pl-4">
                  <p className="font-medium">{qual.title}</p>
                  {qual.issuingBody && (
                    <p className="text-sm text-muted-foreground">
                      {qual.issuingBody}
                      {qual.issuedAt &&
                        ` • ${qual.issuedAt.toLocaleDateString("en-MY", {
                          year: "numeric",
                          month: "long",
                        })}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
