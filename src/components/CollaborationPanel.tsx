import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  MessageSquare, 
  Clock, 
  FileDown, 
  Share2, 
  Mail,
  Rocket,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Download,
  Settings,
  PlayCircle,
  Upload
} from 'lucide-react';
import type { CampaignData } from '../types';

// Define missing types
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface Comment {
  id: string;
  author: TeamMember;
  content: string;
  timestamp: Date;
  type?: 'comment' | 'decision' | 'approval';
}

interface CollaborationPanelProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function CollaborationPanel({ data, onUpdate, onNext, onPrev }: CollaborationPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'viewer' | 'editor' | 'admin'>('editor');
  const [activationStep, setActivationStep] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const finalStrategy = data.strategies.find(s => s.id === data.finalStrategy);

  // Mock activation steps
  const activationSteps = [
    'Preparing campaign data',
    'Validating audience cohorts',
    'Generating platform-specific configs',
    'Establishing API connections',
    'Creating campaigns',
    'Activation complete'
  ];

  const addComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      content: newComment,
      timestamp: new Date(),
      target: 'campaign',
      tags: []
    };
    
    onUpdate({
      comments: [...data.comments, comment]
    });
    setNewComment('');
  };

  const addTeamMember = () => {
    if (!newMemberEmail.trim()) return;
    
    const member: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMemberEmail.split('@')[0],
      email: newMemberEmail,
      role: newMemberRole
    };
    
    onUpdate({
      teamMembers: [...data.teamMembers, member]
    });
    setNewMemberEmail('');
  };

  const generateExportData = () => {
    if (!finalStrategy) return null;

    return {
      campaign_name: `${data.name}_${data.category}_${new Date().getFullYear()}`,
      target_population: `${data.directCohorts.ageRange[0]}-${data.directCohorts.ageRange[1]} years, ${data.directCohorts.gender.length > 0 ? data.directCohorts.gender.join('/') : 'all genders'}, ${data.region}`,
      channels: finalStrategy.channels.reduce((acc, channel, index) => {
        acc[channel] = 1 / finalStrategy.channels.length; // Equal split for simplicity
        return acc;
      }, {} as Record<string, number>),
      budget: data.budget,
      flight_days: data.flightLength,
      cohort_definition: {
        direct_cohorts: data.directCohorts,
        proxy_cohorts: data.proxyCohorts,
        estimated_population: data.directCohorts.population
      },
      performance_targets: {
        target_roas: finalStrategy.roas,
        target_reach: finalStrategy.reach,
        max_risk_tolerance: finalStrategy.risk
      }
    };
  };

  const startActivation = async () => {
    if (!finalStrategy) return;

    setActivationStep(0);
    onUpdate({
      activation: {
        ...data.activation,
        status: 'exporting'
      }
    });

    // Simulate activation process
    for (let i = 0; i <= activationSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setActivationStep(i);
      
      if (i === activationSteps.length) {
        onUpdate({
          activation: {
            status: 'active',
            activatedChannels: finalStrategy.channels,
            campaignIds: finalStrategy.channels.reduce((acc, channel) => {
              acc[channel] = `camp_${channel}_${Math.random().toString(36).substr(2, 9)}`;
              return acc;
            }, {} as Record<string, string>),
            startDate: new Date(),
            endDate: new Date(Date.now() + data.flightLength * 24 * 60 * 60 * 1000),
            exportData: {
              cohortJson: JSON.stringify(generateExportData(), null, 2),
              channelConfigs: finalStrategy.channels.reduce((acc, channel) => {
                acc[channel] = {
                  platform: channel,
                  budget_allocation: data.budget / finalStrategy.channels.length,
                  targeting: data.directCohorts
                };
                return acc;
              }, {} as Record<string, any>),
              activationTimestamp: new Date()
            }
          }
        });
      }
    }
  };

  const exportData = {
    json: JSON.stringify(generateExportData(), null, 2),
    csv: `Campaign Name,Target Population,Budget,Flight Days,Expected ROAS,Expected Reach
${data.name},${data.directCohorts.population} people,${data.budget},${data.flightLength},${finalStrategy?.roas || 0},${finalStrategy?.reach || 0}%`
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2>Campaign Export & Activation</h2>
        <p className="text-muted-foreground mt-2">
          Collaborate with your team, export campaign data, and activate across advertising channels.
        </p>
      </div>

      {!finalStrategy && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a final strategy in the previous step before proceeding with activation.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="collaboration" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="collaboration">Team Collaboration</TabsTrigger>
          <TabsTrigger value="export">Data Export</TabsTrigger>
          <TabsTrigger value="activation">Channel Activation</TabsTrigger>
          <TabsTrigger value="summary">Campaign Summary</TabsTrigger>
        </TabsList>

        {/* Team Collaboration Tab */}
        <TabsContent value="collaboration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="team@company.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addTeamMember}>
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {data.teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                  
                  {data.teamMembers.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No team members added yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Comments & Discussion</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Add a comment about this strategy..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button onClick={addComment} className="self-end">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">User</div>
                        <div className="text-xs text-muted-foreground">
                          {comment.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm">{comment.content}</div>
                    </div>
                  ))}
                  
                  {data.comments.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No comments yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Decision Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.decisionLog.map(decision => (
                  <div key={decision.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{decision.decision}</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                ))}
                
                {data.decisionLog.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No decisions logged yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileDown className="h-5 w-5" />
                <span>Export Campaign Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">JSON Export (API Integration)</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto max-h-64">
                      {exportData.json}
                    </pre>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Cross-Match Audience Seeding</span>
                  </h4>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg space-y-4">
                    <p className="text-sm text-gray-700">
                      Match your SynthiePop segments with existing customer populations to create high-value seed audiences for lookalike expansion.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/80 p-3 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="text-sm font-medium">Available Populations</span>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>CRM Database (2.3M records)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>Email Subscribers (1.8M records)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Mobile App Users (890K records)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Loyalty Members (560K records)</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="bg-white/80 p-3 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <span className="text-sm font-medium">Match Results</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Records:</span>
                            <span className="font-medium">4.1M</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Matched with SynthiePop:</span>
                            <span className="font-medium text-green-600">1.2M (29%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">High-Value Matches:</span>
                            <span className="font-medium text-blue-600">340K</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Seed Quality Score:</span>
                            <span className="font-medium text-emerald-600">92/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Privacy-Safe Matching</p>
                          <p className="text-amber-700 mt-1">
                            All matching performed using hashed identifiers in compliance with GDPR. 
                            No PII is exposed during the cross-matching process.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Match Rules
                      </Button>
                      <Button className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white">
                        <Upload className="h-4 w-4 mr-2" />
                        Export Seed Audience
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Integration Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="font-medium">Clean Rooms</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Privacy-safe data activation via LiveRamp or InfoSum
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Connect Clean Room
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">DSP Integration</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Direct API integration with TTD, DV360, Xandr
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Configure DSP
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Share2 className="h-4 w-4" />
                        <span className="font-medium">Manual Upload</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download and manually upload to advertising platforms
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Download Package
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Activation Tab */}
        <TabsContent value="activation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>Campaign Activation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.activation.status === 'draft' && finalStrategy && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ready to activate campaign "{data.name}" with {finalStrategy.channels.length} channels and €{(data.budget/1000).toFixed(0)}k budget.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {finalStrategy.channels.map(channel => (
                      <Card key={channel}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <Badge variant="outline">Ready</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Budget: €{(data.budget / finalStrategy.channels.length / 1000).toFixed(1)}k</div>
                            <div>Expected ROAS: {finalStrategy.roas.toFixed(1)}x</div>
                            <div>Estimated Reach: {(finalStrategy.reach / finalStrategy.channels.length).toFixed(0)}%</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button 
                    onClick={startActivation} 
                    className="w-full" 
                    size="lg"
                    disabled={!finalStrategy}
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    Start Campaign Activation
                  </Button>
                </div>
              )}

              {data.activation.status === 'exporting' && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="text-lg font-medium">Activating Campaign...</div>
                    <div className="text-sm text-muted-foreground">
                      {activationSteps[activationStep] || 'Complete'}
                    </div>
                  </div>
                  
                  <Progress value={(activationStep / activationSteps.length) * 100} className="h-3" />
                  
                  <div className="space-y-2">
                    {activationSteps.map((step, index) => (
                      <div key={index} className={`flex items-center space-x-2 text-sm ${
                        index < activationStep ? 'text-green-600' :
                        index === activationStep ? 'text-blue-600' :
                        'text-muted-foreground'
                      }`}>
                        {index < activationStep ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : index === activationStep ? (
                          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-muted rounded-full" />
                        )}
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.activation.status === 'active' && (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Campaign successfully activated! You can now monitor performance in real-time.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h5 className="font-medium">Active Campaign IDs</h5>
                    {Object.entries(data.activation.campaignIds).map(([channel, campaignId]) => (
                      <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {campaignId}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                    ))}
                  </div>

                  <Button onClick={onNext} className="w-full" size="lg">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    View Performance Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {finalStrategy ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h5 className="font-medium">Campaign Details</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Campaign Name:</span>
                        <span>{data.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{data.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Region:</span>
                        <span>{data.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span>€{(data.budget / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flight Length:</span>
                        <span>{data.flightLength} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-medium">Selected Strategy</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Strategy:</span>
                        <span>{finalStrategy.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected ROAS:</span>
                        <span>{finalStrategy.roas.toFixed(1)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Reach:</span>
                        <span>{finalStrategy.reach}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Level:</span>
                        <span>{finalStrategy.risk}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Channels:</span>
                        <span>{finalStrategy.channels.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <h5 className="font-medium">Target Audience</h5>
                    <div className="text-sm space-y-1">
                      <div>Age: {data.directCohorts.ageRange[0]}-{data.directCohorts.ageRange[1]} years</div>
                      <div>Population: {data.directCohorts.population.toLocaleString()} people</div>
                      <div>Channels: {finalStrategy.channels.join(', ')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No strategy selected for implementation
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onNext} disabled={data.activation.status === 'draft'}>
          Performance Monitoring
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}