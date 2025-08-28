import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart3,
  Target,
  Globe,
  Megaphone,
  LineChart,
  DollarSign,
  Calendar,
  Zap,
  Database,
  Settings2,
  Brain,
  Lock,
  Sparkles
} from 'lucide-react';

interface WorkflowCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: 'available' | 'coming-soon' | 'locked';
  permission: string;
  usage?: {
    lastUsed?: string;
    timesUsed?: number;
  };
  badge?: string;
}

const workflows: WorkflowCard[] = [
  {
    id: 'retail-media',
    title: 'Retail Media Audience Planner',
    description: 'Build and optimize audience segments for retail media campaigns',
    icon: ShoppingCart,
    color: 'bg-blue-500',
    status: 'available',
    permission: 'retail_media',
    usage: { lastUsed: '2 hours ago', timesUsed: 45 },
    badge: 'Most Used'
  },
  {
    id: 'google-ads',
    title: 'Google Ads Manager',
    description: 'Create and manage Google Ads campaigns with AI optimization',
    icon: Globe,
    color: 'bg-green-500',
    status: 'available',
    permission: 'google_ads',
    usage: { lastUsed: '1 day ago', timesUsed: 23 }
  },
  {
    id: 'meta-ads',
    title: 'Meta Business Suite',
    description: 'Manage Facebook and Instagram advertising campaigns',
    icon: Megaphone,
    color: 'bg-indigo-500',
    status: 'available',
    permission: 'meta_ads',
    usage: { lastUsed: '3 days ago', timesUsed: 18 }
  },
  {
    id: 'linkedin-ads',
    title: 'LinkedIn Campaign Manager',
    description: 'B2B advertising and lead generation on LinkedIn',
    icon: Users,
    color: 'bg-cyan-500',
    status: 'available',
    permission: 'linkedin_ads',
    usage: { timesUsed: 12 }
  },
  {
    id: 'programmatic-dsp',
    title: 'Programmatic DSP',
    description: 'Automated media buying across multiple ad exchanges',
    icon: Zap,
    color: 'bg-purple-500',
    status: 'coming-soon',
    permission: 'dsp',
    badge: 'Coming Soon'
  },
  {
    id: 'analytics-hub',
    title: 'Analytics Hub',
    description: 'Cross-channel performance analytics and reporting',
    icon: BarChart3,
    color: 'bg-orange-500',
    status: 'available',
    permission: 'analytics',
    usage: { lastUsed: 'Yesterday', timesUsed: 67 }
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Optimizer',
    description: 'AI-powered budget allocation across all channels',
    icon: DollarSign,
    color: 'bg-emerald-500',
    status: 'available',
    permission: 'budget',
    usage: { timesUsed: 8 }
  },
  {
    id: 'campaign-calendar',
    title: 'Campaign Calendar',
    description: 'Plan and schedule campaigns across all platforms',
    icon: Calendar,
    color: 'bg-pink-500',
    status: 'available',
    permission: 'calendar',
    usage: { lastUsed: '5 days ago', timesUsed: 31 }
  },
  {
    id: 'audience-insights',
    title: 'Audience Insights',
    description: 'Deep dive into audience behavior and preferences',
    icon: Brain,
    color: 'bg-violet-500',
    status: 'coming-soon',
    permission: 'insights',
    badge: 'Beta'
  },
  {
    id: 'creative-studio',
    title: 'Creative Studio',
    description: 'AI-powered ad creative generation and testing',
    icon: Sparkles,
    color: 'bg-rose-500',
    status: 'locked',
    permission: 'creative',
    badge: 'Premium'
  },
  {
    id: 'data-connector',
    title: 'Data Connector',
    description: 'Connect and sync data from multiple sources',
    icon: Database,
    color: 'bg-slate-500',
    status: 'available',
    permission: 'data',
    usage: { timesUsed: 5 }
  },
  {
    id: 'campaign-templates',
    title: 'Campaign Templates',
    description: 'Pre-built templates for common campaign types',
    icon: Settings2,
    color: 'bg-amber-500',
    status: 'available',
    permission: 'templates',
    usage: { lastUsed: '1 week ago', timesUsed: 15 }
  }
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant, checkWorkflowAccess, getUsagePercentage } = useTenant();

  const handleWorkflowClick = (workflow: WorkflowCard) => {
    if (workflow.status === 'locked') {
      // Show upgrade modal or message
      return;
    }
    
    if (workflow.status === 'coming-soon') {
      // Show coming soon message
      return;
    }

    // Check permissions
    if (!user?.permissions.includes(workflow.permission) && !user?.permissions.includes('admin')) {
      return;
    }

    // Navigate to the workflow
    if (workflow.id === 'retail-media') {
      navigate('/workflows/retail-media');
    } else {
      // Other workflows to be implemented
      console.log(`Navigate to ${workflow.id}`);
    }
  };

  // Calculate stats
  const totalCampaigns = workflows.reduce((sum, w) => sum + (w.usage?.timesUsed || 0), 0);
  const activeWorkflows = workflows.filter(w => w.status === 'available' && user?.permissions.includes(w.permission)).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, {user?.name}
            </h1>
            <p className="text-muted-foreground">
              {tenant?.name} • {tenant?.subscription.plan} Plan
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {tenant?.subscription.status === 'trialing' ? 'Trial' : 'Active'}
          </Badge>
        </div>
      </div>

      {/* Trial/Subscription Alert */}
      {tenant?.subscription.status === 'trialing' && tenant.subscription.trialEndsAt && (
        <Alert className="mb-6">
          <AlertDescription>
            Your trial ends on {new Date(tenant.subscription.trialEndsAt).toLocaleDateString()}.
            <a href="/organization" className="ml-2 text-primary hover:underline">
              Upgrade now
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">Available to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+23%</div>
            <Progress value={73} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45.2K</div>
            <p className="text-xs text-muted-foreground">of $60K monthly</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {workflows.map((workflow) => {
          const hasAccess = user?.permissions.includes(workflow.permission) || user?.permissions.includes('admin');
          const isDisabled = workflow.status !== 'available' || !hasAccess;
          
          return (
            <Card
              key={workflow.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                isDisabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
              }`}
              onClick={() => !isDisabled && handleWorkflowClick(workflow)}
            >
              {/* Color bar at top */}
              <div className={`h-1 ${workflow.color}`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg ${workflow.color} bg-opacity-10`}>
                    <workflow.icon className={`h-6 w-6 ${workflow.color.replace('bg-', 'text-')}`} />
                  </div>
                  {workflow.badge && (
                    <Badge 
                      variant={workflow.status === 'locked' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {workflow.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{workflow.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {workflow.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {workflow.usage && workflow.status === 'available' && hasAccess && (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {workflow.usage.lastUsed && (
                      <div className="flex justify-between">
                        <span>Last used</span>
                        <span className="font-medium">{workflow.usage.lastUsed}</span>
                      </div>
                    )}
                    {workflow.usage.timesUsed && (
                      <div className="flex justify-between">
                        <span>Total runs</span>
                        <span className="font-medium">{workflow.usage.timesUsed}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {workflow.status === 'coming-soon' && (
                  <div className="text-sm text-muted-foreground">
                    Available soon
                  </div>
                )}
                
                {workflow.status === 'locked' && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Requires upgrade
                  </div>
                )}
                
                {!hasAccess && workflow.status === 'available' && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    No permission
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[
                { action: 'Campaign created', workflow: 'Retail Media', time: '2 hours ago', icon: ShoppingCart },
                { action: 'Budget adjusted', workflow: 'Google Ads', time: '5 hours ago', icon: DollarSign },
                { action: 'Report exported', workflow: 'Analytics Hub', time: 'Yesterday', icon: LineChart },
                { action: 'Audience segment updated', workflow: 'Retail Media', time: '2 days ago', icon: Users },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center space-x-3">
                    <activity.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.workflow}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}