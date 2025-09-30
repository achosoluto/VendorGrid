
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  Shield,
  Bot
} from "lucide-react";

interface IngestionStatus {
  isRunning: boolean;
  processed: number;
  errors: string[];
  currentSource: string;
  totalSources: number;
  newProfiles: number;
  updatedProfiles: number;
  verificationsPending: number;
}

export default function DataIngestionDemo() {
  const { user } = useAuth();
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus>({
    isRunning: false,
    processed: 0,
    errors: [],
    currentSource: '',
    totalSources: 3,
    newProfiles: 0,
    updatedProfiles: 0,
    verificationsPending: 0
  });

  // Start ingestion mutation
  const startIngestion = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/data-ingestion/start', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to start ingestion');
      return response.json();
    },
    onSuccess: () => {
      setIngestionStatus(prev => ({ ...prev, isRunning: true }));
    }
  });

  // Poll ingestion status
  const { data: statusData } = useQuery({
    queryKey: ['/api/data-ingestion/status'],
    refetchInterval: ingestionStatus.isRunning ? 2000 : false,
    enabled: ingestionStatus.isRunning
  });

  useEffect(() => {
    if (statusData) {
      setIngestionStatus(statusData);
    }
  }, [statusData]);

  const progress = ingestionStatus.totalSources > 0 
    ? (ingestionStatus.processed / ingestionStatus.totalSources) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined} />
      
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Autonomous Data Verification Demo
            </h1>
            <p className="text-muted-foreground">
              Watch our AI agents automatically collect, verify, and update vendor data from Canadian government sources
            </p>
          </div>

          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Autonomous Pipeline Control
              </CardTitle>
              <CardDescription>
                Start the automated data collection and verification process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Button 
                  onClick={() => startIngestion.mutate()}
                  disabled={ingestionStatus.isRunning || startIngestion.isPending}
                  className="flex items-center gap-2"
                >
                  {ingestionStatus.isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Start Autonomous Ingestion
                    </>
                  )}
                </Button>
                
                {ingestionStatus.isRunning && (
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing: {ingestionStatus.currentSource}</span>
                      <span>{ingestionStatus.processed}/{ingestionStatus.totalSources} sources</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Profiles</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+{ingestionStatus.newProfiles}</div>
                <p className="text-xs text-muted-foreground">Auto-created from registries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updates Applied</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{ingestionStatus.updatedProfiles}</div>
                <p className="text-xs text-muted-foreground">Existing records enhanced</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Verifications</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{ingestionStatus.verificationsPending}</div>
                <p className="text-xs text-muted-foreground">Queued for AI validation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">99.2%</div>
                <p className="text-xs text-muted-foreground">Accuracy rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Live Activity Feed */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList>
              <TabsTrigger value="activity">Live Activity</TabsTrigger>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
              <TabsTrigger value="verification">AI Verification</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Processing Feed</CardTitle>
                  <CardDescription>
                    Live updates as the system processes vendor data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {ingestionStatus.isRunning ? (
                      <>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <div>
                            <p className="font-medium">Processing Corporations Canada Registry</p>
                            <p className="text-sm text-muted-foreground">Extracting 15,000+ business records...</p>
                          </div>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="font-medium">Created: Maple Tech Solutions Inc.</p>
                            <p className="text-sm text-muted-foreground">Tax ID: 123456789 - Auto-verified via CRA lookup</p>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">New</Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                          <Bot className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="font-medium">AI Agent: Enhanced Northwind Trading</p>
                            <p className="text-sm text-muted-foreground">Updated banking info, verified GST status</p>
                          </div>
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600">Enhanced</Badge>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Start the ingestion process to see live activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Government Data Sources</CardTitle>
                  <CardDescription>
                    Autonomous monitoring of official Canadian business registries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Corporations Canada', status: 'active', records: '45,000+', lastSync: '2 mins ago' },
                      { name: 'Canada Business Registry', status: 'active', records: '32,000+', lastSync: '5 mins ago' },
                      { name: 'Ontario Business Registry', status: 'pending', records: '18,000+', lastSync: '1 hour ago' }
                    ].map((source, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{source.name}</p>
                            <p className="text-sm text-muted-foreground">{source.records} business records</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={source.status === 'active' ? 'default' : 'secondary'}>
                            {source.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{source.lastSync}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Verification Pipeline</CardTitle>
                  <CardDescription>
                    Intelligent validation and enhancement of vendor data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        step: 'Tax ID Validation', 
                        description: 'Cross-reference with CRA database',
                        status: 'completed',
                        confidence: '99.8%'
                      },
                      { 
                        step: 'Address Normalization', 
                        description: 'Canada Post validation & standardization',
                        status: 'active',
                        confidence: '95.2%'
                      },
                      { 
                        step: 'Banking Verification', 
                        description: 'Financial institution validation',
                        status: 'queued',
                        confidence: 'Pending'
                      }
                    ].map((step, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {step.status === 'active' && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
                          {step.status === 'queued' && <Clock className="w-5 h-5 text-gray-600" />}
                          <div>
                            <p className="font-medium">{step.step}</p>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={step.status === 'completed' ? 'default' : 'secondary'}
                            className={step.status === 'completed' ? 'bg-green-500/10 text-green-600' : ''}
                          >
                            {step.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">{step.confidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
