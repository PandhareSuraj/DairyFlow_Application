import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Milk } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  useEffect(() => {
    const newTitle = 'Terms of Service | DairyFlow';
    const newDesc = 'DairyFlow terms of service. Understand the rules, guidelines, and legal agreements for using our dairy delivery management software.';
    const url = 'https://dairyflow.mywebz.in/terms';
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using DairyFlow ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users including dairy owners, delivery personnel, and customers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow is a dairy delivery management platform that provides tools for managing milk subscriptions, optimizing delivery routes, tracking orders, managing customer relationships, and administering loyalty programs. The Platform connects dairy owners, delivery personnel, and end customers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>You must be at least 18 years old to create an account</li>
              <li>Each user may maintain only one active account per role</li>
              <li>You agree to notify us immediately of any unauthorized access to your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Subscription and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dairy owners subscribe to DairyFlow plans (Starter, Professional, or Enterprise) to access platform features. Subscription fees are billed monthly or annually as selected. Free trial periods of 14 days are available for new accounts. We reserve the right to modify pricing with 30 days advance notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Milk Delivery Orders</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow facilitates the management of milk delivery orders between dairy owners and customers. The actual delivery of milk products is the responsibility of the dairy owner and their delivery personnel. DairyFlow is not responsible for the quality, quantity, or timeliness of milk deliveries. Disputes regarding orders should be resolved directly between the customer and dairy owner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Dairy Owners:</strong> Ensure product quality, accurate pricing, timely deliveries, and compliance with food safety regulations</li>
              <li><strong>Delivery Personnel:</strong> Follow assigned routes, handle products with care, maintain hygiene standards, and update delivery status accurately</li>
              <li><strong>Customers:</strong> Provide accurate delivery addresses, be available for deliveries, and make timely payments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Loyalty Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow's loyalty program awards points for purchases, referrals, and engagement. Points have no cash value and cannot be transferred. We reserve the right to modify the loyalty program terms, point values, and rewards at any time. Fraudulent activity in the loyalty program will result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the DairyFlow platform, including but not limited to the design, code, algorithms, trademarks, and documentation, are owned by DairyFlow and protected by intellectual property laws. Users may not copy, modify, distribute, or reverse-engineer any part of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              DairyFlow provides the Platform on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free service. To the maximum extent permitted by law, DairyFlow shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the Platform. Our total liability shall not exceed the amount paid by you in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violation of these terms, fraudulent activity, or any conduct that we determine is harmful to other users or the Platform. You may terminate your account at any time by contacting support. Upon termination, your right to use the Platform ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service are governed by the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Maharashtra, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use of the Platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at{' '}
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

export default TermsOfService;
