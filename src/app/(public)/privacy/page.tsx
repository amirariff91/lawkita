import { Metadata } from "next";
import { PageHeader } from "@/components/static";

export const metadata: Metadata = {
  title: "Privacy Policy | LawKita",
  description: "Learn how LawKita collects, uses, and protects your personal data in compliance with Malaysia's Personal Data Protection Act 2010 (PDPA).",
};

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        description="How we collect, use, and protect your personal data"
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
          <p className="text-muted-foreground">
            Last updated: January 2025
          </p>

          <h2>1. Introduction</h2>
          <p>
            LawKita (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal data in
            accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you
            visit our website lawkita.my and use our services.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Personal Data</h3>
          <p>We may collect the following types of personal data:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password, and profile picture when you create an account</li>
            <li><strong>Professional Information:</strong> For lawyers - Bar membership number, firm name, practice areas, qualifications, and professional experience</li>
            <li><strong>Contact Information:</strong> Phone number, office address, and business email</li>
            <li><strong>Communication Data:</strong> Messages sent through our enquiry system</li>
            <li><strong>Payment Information:</strong> Billing details for premium subscriptions (processed securely through Stripe)</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <p>When you visit our website, we automatically collect:</p>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Pages visited and time spent on pages</li>
            <li>Referring website or source</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your personal data for the following purposes:</p>
          <ul>
            <li><strong>Service Delivery:</strong> To provide and maintain our lawyer directory services</li>
            <li><strong>Account Management:</strong> To create and manage your user account</li>
            <li><strong>Communication:</strong> To send enquiries to lawyers and facilitate responses</li>
            <li><strong>Profile Verification:</strong> To verify lawyer credentials with the Malaysian Bar Council</li>
            <li><strong>Payment Processing:</strong> To process subscription payments</li>
            <li><strong>Analytics:</strong> To improve our services and user experience</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
          </ul>

          <h2>4. Disclosure of Your Information</h2>
          <p>We may share your personal data with:</p>
          <ul>
            <li><strong>Lawyers:</strong> When you submit an enquiry, your contact details and message are shared with the selected lawyer</li>
            <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (hosting, payment processing, email services)</li>
            <li><strong>Legal Authorities:</strong> When required by law or to protect our legal rights</li>
            <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of assets</li>
          </ul>
          <p>
            We do not sell your personal data to third parties for marketing purposes.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            data against unauthorized access, alteration, disclosure, or destruction. These measures
            include:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Secure password hashing</li>
            <li>Access controls and authentication</li>
            <li>Regular security assessments</li>
          </ul>

          <h2>6. Your Rights Under PDPA</h2>
          <p>Under Malaysia&apos;s PDPA, you have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Withdrawal:</strong> Withdraw consent for processing (where consent is the legal basis)</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
          </ul>
          <p>
            To exercise these rights, please contact us at privacy@lawkita.my.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your personal data only for as long as necessary to fulfill the purposes for
            which it was collected, including to satisfy legal, accounting, or reporting requirements.
            Lawyer profile data may be retained for historical and archival purposes related to
            publicly available court records.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your browsing experience, analyze
            website traffic, and understand user preferences. You can control cookie settings through
            your browser. Essential cookies are required for the website to function properly.
          </p>

          <h2>9. Third-Party Links</h2>
          <p>
            Our website may contain links to third-party websites. We are not responsible for the
            privacy practices of these external sites. We encourage you to review their privacy
            policies.
          </p>

          <h2>10. Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for individuals under the age of 18. We do not knowingly
            collect personal data from children.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            Continued use of our services after changes constitutes acceptance of the updated policy.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul>
            <li>Email: privacy@lawkita.my</li>
            <li>Address: Kuala Lumpur, Malaysia</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-8">
            This Privacy Policy is compliant with the Personal Data Protection Act 2010 (Act 709) of Malaysia.
          </p>
        </div>
      </div>
    </div>
  );
}
