import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { VendorProfileCard } from "@/components/VendorProfileCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AuditLogEntry } from "@/components/AuditLogEntry";
import { AccessLogTable } from "@/components/AccessLogTable";
import { DataProvenanceTag } from "@/components/DataProvenanceTag";
import { Eye, FileEdit, Shield } from "lucide-react";

export default function VendorDashboard() {
  //todo: remove mock functionality
  const [vendorData] = useState({
    companyName: "Acme Corporation",
    taxId: "XX-XXX1234",
    address: "123 Business St, San Francisco, CA 94105",
    phone: "+1 (555) 123-4567",
    email: "contact@acme.com",
    status: "verified" as const,
  });

  //todo: remove mock functionality
  const [auditLogs] = useState([
    {
      id: "1",
      action: "updated banking information",
      actor: "John Doe",
      timestamp: "Sep 29, 2025 at 2:45 PM",
    },
    {
      id: "2",
      action: "verified company address",
      actor: "System Agent",
      timestamp: "Sep 29, 2025 at 1:20 PM",
    },
    {
      id: "3",
      action: "claimed vendor profile",
      actor: "John Doe",
      timestamp: "Sep 28, 2025 at 10:30 AM",
    },
  ]);

  //todo: remove mock functionality
  const [accessLogs] = useState([
    {
      id: "1",
      accessor: "Sarah Johnson",
      company: "Global Manufacturing Inc",
      action: "Viewed Profile",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      accessor: "Michael Chen",
      company: "Tech Solutions LLC",
      action: "Downloaded Data",
      timestamp: "5 hours ago",
    },
    {
      id: "3",
      accessor: "Emma Williams",
      company: "Enterprise Systems Corp",
      action: "Viewed Profile",
      timestamp: "1 day ago",
    },
    {
      id: "4",
      accessor: "David Brown",
      company: "Supply Chain Partners",
      action: "Viewed Profile",
      timestamp: "2 days ago",
    },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="John Doe" />
      
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
              Vendor Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your verified company profile and view access history
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-profile-views">127</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <FileEdit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-last-updated">2 days ago</div>
                <p className="text-xs text-muted-foreground">Sep 27, 2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verification Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-verification-status">
                  Verified
                </div>
                <p className="text-xs text-muted-foreground">All fields confirmed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <VendorProfileCard {...vendorData} />
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" data-testid="button-edit-profile">
                  Edit Profile
                </Button>
                <Button variant="outline" data-testid="button-view-public">
                  View Public Profile
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Provenance</CardTitle>
                <CardDescription>
                  See how each field in your profile was verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Company Name</span>
                    <DataProvenanceTag
                      source="Tax ID Lookup"
                      method="AI Agent (Tax ID verification)"
                      timestamp="Sep 28, 2025"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tax ID</span>
                    <DataProvenanceTag
                      source="IRS Database"
                      method="Government Registry"
                      timestamp="Sep 28, 2025"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Address</span>
                    <DataProvenanceTag
                      source="USPS Verification"
                      method="Address Validation API"
                      timestamp="Sep 29, 2025"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Banking Info</span>
                    <DataProvenanceTag
                      source="Manual Entry"
                      method="Vendor Submitted"
                      timestamp="Sep 29, 2025"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="audit" className="w-full">
            <TabsList>
              <TabsTrigger value="audit" data-testid="tab-audit-log">
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="access" data-testid="tab-access-log">
                Access History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="audit" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>
                    Immutable record of all changes to your profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <AuditLogEntry key={log.id} {...log} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Who Viewed Your Profile</CardTitle>
                  <CardDescription>
                    Complete transparency of who has accessed your vendor data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccessLogTable logs={accessLogs} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
