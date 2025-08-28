import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Building2,
  Users,
  CreditCard,
  Shield,
  Activity,
  Settings,
  TrendingUp,
  HardDrive,
  Zap,
  Mail,
  UserPlus,
  Crown,
  Check,
  X,
  AlertCircle,
  Download
} from 'lucide-react';

const planFeatures = {
  free: ['3 Users', '5 Campaigns', 'Basic Analytics', '1GB Storage'],
  starter: ['10 Users', '50 Campaigns', 'Advanced Analytics', '10GB Storage', 'API Access'],
  professional: ['50 Users', '500 Campaigns', 'All Workflows', '100GB Storage', 'SSO', 'Priority Support'],
  enterprise: ['Unlimited Users', 'Unlimited Campaigns', 'White Label', 'Custom Integrations', 'Dedicated Support'],
};

export function TenantSettings() {
  const { tenant, checkFeature, getUsagePercentage } = useTenant();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!tenant) return null;

  const isOwnerOrAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization, subscription, and team
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input defaultValue={tenant.name} disabled={!isOwnerOrAdmin} />
                </div>
                <div>
                  <Label>Subdomain</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={tenant.slug} disabled />
                    <span className="text-sm text-muted-foreground">.platform.com</span>
                  </div>
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" defaultValue="admin@demo.com" disabled={!isOwnerOrAdmin} />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input type="tel" defaultValue="+1 555 0123" disabled={!isOwnerOrAdmin} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{tenant.subscription.plan}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${tenant.subscription.plan === 'professional' ? '299' : '0'}/month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tenant.subscription.usage.users} / {tenant.subscription.limits.users}
                </div>
                <Progress 
                  value={getUsagePercentage('users')} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <HardDrive className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tenant.subscription.usage.storage}GB / {tenant.subscription.limits.storage}GB
                </div>
                <Progress 
                  value={getUsagePercentage('storage')} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(planFeatures).map(([plan, features]) => {
                  const isCurrentPlan = tenant.subscription.plan === plan;
                  const isPlanHigher = ['free', 'starter', 'professional', 'enterprise'].indexOf(plan) >
                    ['free', 'starter', 'professional', 'enterprise'].indexOf(tenant.subscription.plan);
                  
                  return (
                    <Card 
                      key={plan} 
                      className={`relative ${isCurrentPlan ? 'border-primary' : ''}`}
                    >
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge>Current Plan</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <CardTitle className="capitalize">{plan}</CardTitle>
                        <div className="text-2xl font-bold">
                          {plan === 'free' && '$0'}
                          {plan === 'starter' && '$99'}
                          {plan === 'professional' && '$299'}
                          {plan === 'enterprise' && 'Custom'}
                          {plan !== 'free' && plan !== 'enterprise' && (
                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {features.map((feature) => (
                            <li key={feature} className="flex items-center">
                              <Check className="h-3 w-3 mr-2 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button 
                          className="w-full mt-4" 
                          variant={isCurrentPlan ? 'outline' : isPlanHigher ? 'default' : 'secondary'}
                          disabled={isCurrentPlan}
                        >
                          {isCurrentPlan ? 'Current Plan' : isPlanHigher ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {tenant.subscription.usage.users} of {tenant.subscription.limits.users} seats used
                  </CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'John Doe', email: 'john@demo.com', role: 'Owner', status: 'active' },
                  { name: 'Jane Smith', email: 'jane@demo.com', role: 'Admin', status: 'active' },
                  { name: 'Bob Wilson', email: 'bob@demo.com', role: 'Manager', status: 'active' },
                  { name: 'Alice Brown', email: 'alice@demo.com', role: 'Member', status: 'invited' },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                      {member.status === 'invited' && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {member.role !== 'Owner' && (
                        <Button variant="ghost" size="sm">Remove</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>Current billing period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">API Calls</span>
                      <span className="text-sm font-medium">
                        {tenant.subscription.usage.apiCalls.toLocaleString()} / {tenant.subscription.limits.apiCalls.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage('apiCalls')} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Campaigns</span>
                      <span className="text-sm font-medium">
                        {tenant.subscription.usage.campaigns} / {tenant.subscription.limits.campaigns}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage('campaigns')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Breakdown</CardTitle>
                <CardDescription>By content type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Documents</span>
                      <span className="text-sm font-medium">0.75 GB</span>
                    </div>
                    <Progress value={30} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Images</span>
                      <span className="text-sm font-medium">1.25 GB</span>
                    </div>
                    <Progress value={50} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Exports</span>
                      <span className="text-sm font-medium">0.5 GB</span>
                    </div>
                    <Progress value={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Usage resets on {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString()}.
              Consider upgrading if you're approaching limits.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security requirements for your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sso">Single Sign-On (SSO)</Label>
                  <p className="text-sm text-muted-foreground">
                    Require SSO for all team members
                  </p>
                </div>
                <Switch id="sso" checked={checkFeature('sso')} disabled={!checkFeature('sso')} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="2fa">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all team members
                  </p>
                </div>
                <Switch id="2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ip-restrict">IP Restriction</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit access to specific IP addresses
                  </p>
                </div>
                <Switch id="ip-restrict" />
              </div>
              <div>
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Automatically log out after inactivity
                </p>
                <select className="w-full p-2 border rounded-md">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>8 hours</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="outline">Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Download invoices and receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { date: '2024-03-01', amount: 299, status: 'paid' },
                  { date: '2024-02-01', amount: 299, status: 'paid' },
                  { date: '2024-01-01', amount: 299, status: 'paid' },
                ].map((invoice) => (
                  <div key={invoice.date} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">
                        {new Date(invoice.date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">${invoice.amount}.00</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-green-600">
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}