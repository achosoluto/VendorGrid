import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log("Login triggered", { email });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-logo">Vendor Network</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            The industry's most trusted verified vendor data platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Access your verified vendor profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-muted/50 border-muted-foreground/20">
              <Lock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Multi-factor authentication required for all logins
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                  </div>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </div>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button onClick={handleLogin} className="w-full" data-testid="button-sign-in">
              Sign In
            </Button>

            <div className="text-center space-y-2">
              <Button variant="ghost" className="text-sm" data-testid="button-forgot-password">
                Forgot password?
              </Button>
              <div className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button variant="ghost" className="p-0 h-auto" data-testid="button-claim-profile">
                  Claim your profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Why Vendor Network?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>One verified profile for all your customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>End-to-end encryption and immutable audit logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Complete transparency of who accesses your data</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
