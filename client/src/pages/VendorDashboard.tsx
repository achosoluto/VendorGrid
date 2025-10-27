import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { VendorProfile, AuditLog, AccessLog, DataProvenance } from "@shared/schema";
import { DashboardHeader } from "@/components/DashboardHeader";
import { VendorProfileCard } from "@/components/VendorProfileCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AuditLogEntry } from "@/components/AuditLogEntry";
import { AccessLogTable } from "@/components/AccessLogTable";
import { DataProvenanceTag } from "@/components/DataProvenanceTag";
import { Eye, FileEdit, Shield, Plus, Zap } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function VendorDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Fetch vendor profile
  const { data: profileResponse, isLoading: profileLoading, error: profileError } = useQuery<{ profile: VendorProfile | null }>({
    queryKey: ["/api/vendor-profile"],
    retry: false,
    enabled: !!user,
  });
  
  const profile = profileResponse?.profile;

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/vendor-profile", profile?.id, "audit-logs"],
    enabled: !!profile?.id,
  });

  // Fetch access logs
  const { data: accessLogs = [] } = useQuery<AccessLog[]>({
    queryKey: ["/api/vendor-profile", profile?.id, "access-logs"],
    enabled: !!profile?.id,
  });

  // Fetch provenance data
  const { data: provenance = [] } = useQuery<DataProvenance[]>({
    queryKey: ["/api/vendor-profile", profile?.id, "provenance"],
    enabled: !!profile?.id,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (profileError && isUnauthorizedError(profileError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [profileError, toast]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
        <div className="max-w-7xl mx-auto px-8 py-16 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no profile exists, show create profile page
  if (!profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
        <main className="max-w-2xl mx-auto px-8 py-16">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Welcome to Vendor Network</CardTitle>
              </div>
              <CardDescription>
                Create your verified vendor profile to start managing your company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You haven't claimed your vendor profile yet. Create one now to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Manage a single verified profile for all your customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Track who accesses your company information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Maintain an immutable audit trail of all changes</span>
                </li>
              </ul>
              <Link href="/edit">
                <Button className="w-full mt-4" data-testid="button-create-profile">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Vendor Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const maskTaxId = (taxId: string) => {
    if (taxId.length > 4) {
      return 'XX-XXX' + taxId.slice(-4);
    }
    return taxId;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
      
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
                <div className="text-2xl font-bold" data-testid="text-profile-views">
                  {accessLogs.length}
                </div>
                <p className="text-xs text-muted-foreground">Total access logs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <FileEdit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-last-updated">
                  {profile?.updatedAt ? format(new Date(profile.updatedAt), 'MMM d, yyyy') : 'Never'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {auditLogs.length} total changes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verification Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-verification-status">
                  {profile?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile?.verificationStatus === 'verified' ? 'All fields confirmed' : 'Awaiting verification'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              {profile && (
                <VendorProfileCard
                  companyName={profile.companyName}
                  taxId={maskTaxId(profile.taxId)}
                  address={`${profile.address}, ${profile.city}, ${profile.state} ${profile.zipCode}`}
                  phone={profile.phone}
                  email={profile.email}
                  status={profile.verificationStatus as any}
                />
              )}
              <div className="mt-4 flex gap-2">
                <Link href="/edit" className="flex-1">
                  <Button className="w-full" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" className="flex items-center gap-2" data-testid="button-view-demo">
                    <Zap className="w-4 h-4" />
                    Live Demo
                  </Button>
                </Link>
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
                {provenance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No provenance data available</p>
                ) : (
                  <div className="space-y-2">
                    {provenance.map((prov: any) => (
                      <div key={prov.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {prov.fieldName.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <DataProvenanceTag
                          source={prov.source}
                          method={prov.method}
                          timestamp={prov.timeAgo || format(new Date(prov.timestamp), 'MMM d, yyyy')}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="audit" className="w-full">
            <TabsList>
              <TabsTrigger value="audit" data-testid="tab-audit-log">
                Audit Log ({auditLogs.length})
              </TabsTrigger>
              <TabsTrigger value="access" data-testid="tab-access-log">
                Access History ({accessLogs.length})
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
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No audit logs yet</p>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs.map((log) => (
                        <AuditLogEntry
                          key={log.id}
                          action={log.action}
                          actor={log.actorName}
                          timestamp={format(new Date(log.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                          immutable={log.immutable}
                        />
                      ))}
                    </div>
                  )}
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
                  {accessLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No access logs yet</p>
                  ) : (
                    <AccessLogTable logs={accessLogs.map((log: any) => ({
                      id: log.id,
                      accessor: log.accessorName,
                      company: log.accessorCompany,
                      action: log.action,
                      timestamp: log.timeAgo || format(new Date(log.timestamp), 'MMM d, yyyy'),
                    }))} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
