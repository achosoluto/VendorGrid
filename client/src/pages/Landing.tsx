import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold" data-testid="text-logo">Vendor Network</span>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl font-bold tracking-tight" data-testid="text-hero-title">
            The Industry's Most Trusted
            <br />
            <span className="text-primary">Verified Vendor Data Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Create one verified profile for all your customers. Eliminate redundant paperwork
            and ensure your supplier information is always accurate and secure.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">One Verified Profile</h3>
              <p className="text-muted-foreground">
                Create a single, secure profile to represent your company to all customers.
                No more filling out the same forms repeatedly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">End-to-End Security</h3>
              <p className="text-muted-foreground">
                Your data is encrypted in transit and at rest. Every change is logged in an
                immutable audit trail for complete accountability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Complete Transparency</h3>
              <p className="text-muted-foreground">
                See exactly who has accessed your profile and when. Full visibility into
                how your data is being used by your customers.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-semibold mb-6 text-center">
              Why Leading Vendors Choose Our Platform
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Verified Once, Used Everywhere</h4>
                  <p className="text-sm text-muted-foreground">
                    Your Tax ID serves as the authoritative anchor for your profile
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Data Provenance Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Every field shows its verification source and timestamp
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Immutable Audit Logs</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanent record of all profile changes for compliance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">SOC 2 & GDPR Compliant</h4>
                  <p className="text-sm text-muted-foreground">
                    Built with enterprise-grade security from day one
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6 text-center text-sm text-muted-foreground">
          © 2025 Vendor Network. The trusted platform for verified vendor data.
        </div>
      </footer>
    </div>
  );
}
