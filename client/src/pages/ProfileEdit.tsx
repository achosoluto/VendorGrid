import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VendorProfile } from "@shared/schema";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecureFieldInput } from "@/components/SecureFieldInput";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    companyName: "",
    taxId: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    bankName: "",
    accountNumberEncrypted: "",
    routingNumberEncrypted: "",
  });

  // Fetch existing profile
  const { data: profileResponse, isLoading } = useQuery<{ profile: VendorProfile | null }>({
    queryKey: ["/api/vendor-profile"],
    retry: false,
  });
  
  const profile = profileResponse?.profile;

  // Populate form with existing data
  useEffect(() => {
    if (profile) {
      setFormData({
        companyName: profile.companyName || "",
        taxId: profile.taxId || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        phone: profile.phone || "",
        email: profile.email || "",
        website: profile.website || "",
        bankName: profile.bankName || "",
        accountNumberEncrypted: profile.accountNumberEncrypted || "",
        routingNumberEncrypted: profile.routingNumberEncrypted || "",
      });
    }
  }, [profile]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/vendor-profile", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Created",
        description: "Your vendor profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-profile"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/vendor-profile/${profile?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved and logged in the audit trail.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-profile"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const isCreating = !profile;
    
    if (isCreating) {
      // Validate required fields for creation
      if (!formData.companyName || !formData.taxId || !formData.address || 
          !formData.city || !formData.state || !formData.zipCode || 
          !formData.phone || !formData.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      createMutation.mutate({
        ...formData,
        userId: user?.id,
      });
    } else {
      // For updates, only send changed fields
      const changes: any = {};
      Object.keys(formData).forEach((key) => {
        const formValue = (formData as any)[key];
        const profileValue = (profile as any)[key];
        if (formValue !== profileValue && key !== 'taxId') { // Tax ID shouldn't be editable after creation
          changes[key] = formValue;
        }
      });

      if (Object.keys(changes).length === 0) {
        toast({
          title: "No Changes",
          description: "No fields were modified",
        });
        return;
      }

      updateMutation.mutate(changes);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isCreating = !profile;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
      
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
                {isCreating ? 'Create' : 'Edit'} Vendor Profile
              </h1>
              <p className="text-muted-foreground">
                {isCreating ? 'Set up your company information' : 'Update your company information'}
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
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    value={formData.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax ID (EIN) *</Label>
                  <Input
                    id="tax-id"
                    value={formData.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                    placeholder="XX-XXXXXXX"
                    className="font-mono"
                    data-testid="input-tax-id"
                    disabled={!isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isCreating ? 'This will be your unique identifier' : 'Cannot be changed after verification'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  data-testid="input-address"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    data-testid="input-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
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
                  placeholder="https://example.com"
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
                value={formData.accountNumberEncrypted}
                onChange={(value) => updateField("accountNumberEncrypted", value)}
                placeholder="Enter account number"
                helperText="Used for payment processing"
              />

              <SecureFieldInput
                label="Routing Number"
                value={formData.routingNumberEncrypted}
                onChange={(value) => updateField("routingNumberEncrypted", value)}
                placeholder="Enter 9-digit routing number"
                helperText="Your bank's routing number"
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button 
              onClick={handleSave} 
              className="flex-1" 
              data-testid="button-save"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
