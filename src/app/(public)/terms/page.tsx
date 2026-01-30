import { Metadata } from "next";
import { PageHeader } from "@/components/static";

export const metadata: Metadata = {
  title: "Terms of Service | LawKita",
  description: "Read the terms and conditions for using LawKita, Malaysia's lawyer directory platform.",
};

export default function TermsPage() {
  return (
    <div>
      <PageHeader
        title="Terms of Service"
        description="Terms and conditions for using LawKita"
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
          <p className="text-muted-foreground">
            Last updated: January 2025
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using LawKita (&quot;the Service&quot;), you agree to be bound by these Terms of
            Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
            LawKita is operated by LawKita Sdn Bhd, a company registered in Malaysia.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            LawKita is an online platform that provides:
          </p>
          <ul>
            <li>A directory of lawyers practicing in Malaysia</li>
            <li>Information about famous Malaysian legal cases</li>
            <li>A system for users to submit enquiries to lawyers</li>
            <li>Profile management tools for legal professionals</li>
          </ul>

          <h2>3. User Accounts</h2>
          <h3>3.1 Registration</h3>
          <p>
            Certain features of the Service require you to create an account. You agree to provide
            accurate, current, and complete information during registration and to keep your account
            information updated.
          </p>

          <h3>3.2 Account Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account. You must notify us immediately of any
            unauthorized use of your account.
          </p>

          <h3>3.3 Lawyer Profile Claims</h3>
          <p>
            Lawyers may claim and manage their profiles on LawKita. By claiming a profile, you
            represent and warrant that you are the lawyer identified in that profile and that you
            hold a valid practicing certificate from the Malaysian Bar Council.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Impersonate any person or entity</li>
            <li>Submit false or misleading information</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Use automated systems to access the Service without permission</li>
            <li>Collect user information without consent</li>
          </ul>

          <h2>5. Enquiry System</h2>
          <h3>5.1 For Users Submitting Enquiries</h3>
          <p>
            When you submit an enquiry through LawKita, you acknowledge that:
          </p>
          <ul>
            <li>Your contact information and message will be shared with the selected lawyer</li>
            <li>LawKita does not guarantee a response from any lawyer</li>
            <li>No lawyer-client relationship is created through the enquiry system</li>
            <li>You should not share sensitive or confidential information in enquiries</li>
          </ul>

          <h3>5.2 For Lawyers Receiving Enquiries</h3>
          <p>
            Lawyers who receive enquiries agree to:
          </p>
          <ul>
            <li>Respond to enquiries in a timely and professional manner</li>
            <li>Protect the confidentiality of enquiry information</li>
            <li>Comply with the Malaysian Bar Council&apos;s Rules and Rulings</li>
            <li>Not use enquiry data for unsolicited marketing</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <h3>6.1 Our Content</h3>
          <p>
            The Service and its original content, features, and functionality are owned by LawKita
            and are protected by Malaysian and international copyright, trademark, and other
            intellectual property laws.
          </p>

          <h3>6.2 User Content</h3>
          <p>
            By submitting content to LawKita (including profile information, reviews, and messages),
            you grant us a non-exclusive, worldwide, royalty-free license to use, display, and
            distribute such content in connection with the Service.
          </p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Warranties of merchantability or fitness for a particular purpose</li>
            <li>Warranties that the Service will be uninterrupted or error-free</li>
            <li>Warranties regarding the accuracy or completeness of lawyer information</li>
            <li>Warranties regarding the quality of any lawyer&apos;s services</li>
          </ul>
          <p>
            LawKita does not endorse any lawyer listed on the platform and is not responsible for
            the quality of legal services provided by any lawyer.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY MALAYSIAN LAW, LAWKITA SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO:
          </p>
          <ul>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Any damages resulting from your interactions with lawyers</li>
            <li>Any damages resulting from unauthorized access to your account</li>
          </ul>

          <h2>9. Subscription Services</h2>
          <h3>9.1 Paid Plans</h3>
          <p>
            LawKita offers premium subscription plans for lawyers. By subscribing, you agree to pay
            the applicable fees and authorize us to charge your payment method on a recurring basis.
          </p>

          <h3>9.2 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Cancellation will take effect at the end
            of the current billing period. No refunds will be provided for partial billing periods.
          </p>

          <h3>9.3 Price Changes</h3>
          <p>
            We reserve the right to modify subscription prices. We will provide at least 30 days&apos;
            notice before any price changes take effect.
          </p>

          <h2>10. Third-Party Services</h2>
          <p>
            The Service may contain links to third-party websites or services. We are not responsible
            for the content or practices of any third-party sites and encourage you to review their
            terms and privacy policies.
          </p>

          <h2>11. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of material
            changes by posting the updated Terms on the Service and updating the &quot;Last updated&quot; date.
            Your continued use of the Service after changes constitutes acceptance of the modified
            Terms.
          </p>

          <h2>12. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without
            prior notice, for any reason, including breach of these Terms. Upon termination, your
            right to use the Service will cease immediately.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Malaysia.
            Any disputes arising from these Terms or the Service shall be subject to the exclusive
            jurisdiction of the courts of Malaysia.
          </p>

          <h2>14. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions
            will continue in full force and effect.
          </p>

          <h2>15. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us:
          </p>
          <ul>
            <li>Email: legal@lawkita.my</li>
            <li>Address: Kuala Lumpur, Malaysia</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
