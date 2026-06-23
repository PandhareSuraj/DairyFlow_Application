import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Milk } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  useEffect(() => {
    const newTitle = 'Privacy Policy | DairyFlow';
    const newDesc = "Read DairyFlow's privacy policy. Learn how we collect, use, and protect your personal data on our dairy delivery platform.";
    const url = 'https://dairyflow.mywebz.in/privacy';
    document.title = newTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    const origDesc = metaDesc?.getAttribute('content') || '';
    if (metaDesc) metaDesc.setAttribute('content', newDesc);
    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    if (!document.querySelector('link[rel="canonical"]')) document.head.appendChild(link);
    const setOg = (p: string, v: string) => {
      const el = document.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null;
      if (el) el.setAttribute('content', v);
    };
    setOg('og:title', newTitle);
    setOg('og:description', newDesc);
    setOg('og:url', url);
    window.scrollTo(0, 0);
    return () => {
      document.title = "DairyFlow - India's #1 Dairy Delivery Management App";
      if (metaDesc) metaDesc.setAttribute('content', origDesc);
      link.setAttribute('href', 'https://dairyflow.mywebz.in/');
      setOg('og:title', "DairyFlow - Dairy Delivery Software | Route Optimization & Subscriptions");
      setOg('og:description', origDesc);
      setOg('og:url', 'https://dairyflow.mywebz.in/');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <Milk className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">DairyFlow</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you use DairyFlow, we collect information you provide directly, including your name, phone number, email address, delivery address, and dairy business details. We also collect usage data such as device information, IP address, and interaction patterns to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and maintain the DairyFlow platform and services</li>
              <li>To process milk subscription orders and manage deliveries</li>
              <li>To optimize delivery routes using AI-powered algorithms</li>
              <li>To send delivery notifications, order updates, and service communications</li>
              <li>To administer loyalty programs, referral rewards, and promotions</li>
              <li>To improve our platform through analytics and usage patterns</li>
              <li>To provide customer support and respond to inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We share data only with dairy owners and delivery personnel as necessary to fulfill your orders. We may share anonymized, aggregated data for analytics purposes. We may disclose information when required by law or to protect our legal rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS/SSL), encrypted storage, and access controls. Your payment information is processed through secure, PCI-compliant payment processors and is never stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Location Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow collects location data for delivery route optimization and real-time tracking. Customers can view their delivery person's location during active deliveries. Location data from delivery personnel is collected only during active delivery hours and is used solely for route optimization and order tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and preferences (such as language selection). We use analytics tools to understand how our platform is used. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal data. You can update your profile information directly in the app or contact us at <a href="mailto:support@dairyflow.in" className="text-primary hover:underline">support@dairyflow.in</a>. You may request a copy of your data or ask for account deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services. Order history and transaction records are retained for a minimum of 3 years for legal and accounting purposes. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@dairyflow.in" className="text-primary hover:underline">support@dairyflow.in</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-muted/30 border-t border-border py-8 px-4">
        <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DairyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
