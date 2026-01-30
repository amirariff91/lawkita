import { Metadata } from "next";
import { PageHeader, ContactForm } from "@/components/static";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | LawKita",
  description: "Get in touch with the LawKita team. We're here to help with questions about our lawyer directory platform.",
};

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    details: ["support@lawkita.my", "For lawyers: lawyers@lawkita.my"],
  },
  {
    icon: MapPin,
    title: "Location",
    details: ["Kuala Lumpur, Malaysia"],
  },
  {
    icon: Clock,
    title: "Response Time",
    details: ["We typically respond within 1-2 business days"],
  },
];

export default function ContactPage() {
  return (
    <div>
      <PageHeader
        title="Contact Us"
        description="Have questions? We're here to help."
      />

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {contactInfo.map((info) => (
              <Card key={info.title}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <info.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{info.title}</h3>
                      {info.details.map((detail, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* FAQ Link */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Looking for quick answers? Check out our commonly asked questions:
                </p>
                <ul className="text-sm space-y-2">
                  <li className="text-muted-foreground">
                    <strong className="text-foreground">For Users:</strong> How do I find a lawyer? How do I send an enquiry?
                  </li>
                  <li className="text-muted-foreground">
                    <strong className="text-foreground">For Lawyers:</strong> How do I claim my profile? What are the premium features?
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
