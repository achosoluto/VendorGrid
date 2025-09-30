import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecureFieldInput } from "@/components/SecureFieldInput";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

export default function ProfileEdit() {
  const { toast } = useToast();
  
  //todo: remove mock functionality
  const [formData, setFormData] = useState({
    companyName: "Acme Corporation",
    taxId: "12-3456789",
    address: "123 Business St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    phone: "+1 (555) 123-4567",
    email: "contact@acme.com",
    website: "https://acme.com",
    bankName: "First National Bank",
    accountNumber: "",
    routingNumber: "",
  });

  const handleSave = () => {
    console.log("Save triggered", formData);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved and logged in the audit trail.",
    });
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="John Doe" />
      
      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                Edit Vendor Profile
              </h1>
              <p className="text-muted-foreground">
                Update your company information
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic details about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={formData.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax ID (EIN)</Label>
                  <Input
                    id="tax-id"
                    value={formData.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                    placeholder="XX-XXXXXXX"
                    className="font-mono"
                    data-testid="input-tax-id"
                  />
                  <p className="text-xs text-muted-foreground">Cannot be changed after verification</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  data-testid="input-address"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    data-testid="input-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                    data-testid="input-zip"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How customers can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  data-testid="input-website"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banking Information</CardTitle>
              <CardDescription>
                Encrypted payment details for customer transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  value={formData.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  data-testid="input-bank-name"
                />
              </div>

              <SecureFieldInput
                label="Account Number"
                value={formData.accountNumber}
                onChange={(value) => updateField("accountNumber", value)}
                placeholder="Enter account number"
                helperText="Used for payment processing"
              />

              <SecureFieldInput
                label="Routing Number"
                value={formData.routingNumber}
                onChange={(value) => updateField("routingNumber", value)}
                placeholder="Enter 9-digit routing number"
                helperText="Your bank's routing number"
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSave} className="flex-1" data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Link href="/">
              <Button variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
