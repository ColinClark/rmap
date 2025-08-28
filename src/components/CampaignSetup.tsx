import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ChevronRight, Plus, X, Users } from 'lucide-react';
import { CampaignData, TeamMember } from '../App';

interface CampaignSetupProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
}

// Removed regions array - geographic targeting handled in Cohort Builder

// Categories are now derived from selected product - no manual selection needed

export function CampaignSetup({ data, onUpdate, onNext }: CampaignSetupProps) {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'viewer' | 'editor' | 'admin'>('editor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.name && (data.selectedProduct?.category || data.category)) {
      onUpdate({
        category: data.selectedProduct?.category || data.category,
        region: 'Germany' // Set to Germany-wide
      });
      onNext();
    }
  };

  const addTeamMember = () => {
    if (newMemberEmail && !data.teamMembers.some(member => member.email === newMemberEmail)) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberEmail.split('@')[0],
        email: newMemberEmail,
        role: newMemberRole
      };
      
      onUpdate({
        teamMembers: [...data.teamMembers, newMember]
      });
      
      setNewMemberEmail('');
    }
  };

  const removeMember = (memberId: string) => {
    onUpdate({
      teamMembers: data.teamMembers.filter(member => member.id !== memberId)
    });
  };

  const formatBudget = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}k`;
    }
    return `€${value}`;
  };

  const isValid = data.name && (data.selectedProduct?.category || data.category);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2>Campaign Setup</h2>
        <p className="text-muted-foreground mt-2">
          Configure your campaign to leverage the power of <strong>Statista Consumer Insights</strong> and <strong>SynthiePop</strong> synthetic population data for precision targeting and opportunity detection.
        </p>
      </div>

      {/* Data Integration Value Proposition */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-blue-900">Statista Consumer Insights</h3>
              </div>
              <p className="text-sm text-blue-800">
                Access real consumer behavior data, market trends, and purchasing patterns across your target demographics to inform strategic decisions.
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Purchase intent & brand affinity data</li>
                <li>• Category penetration rates by region</li>
                <li>• Consumer journey touchpoints</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-green-900">SynthiePop Data</h3>
              </div>
              <p className="text-sm text-green-800">
                Leverage Germany's most comprehensive synthetic population dataset with 83M+ individuals for precise audience modeling and spend optimization.
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Individual-level demographic profiles</li>
                <li>• Geographic distribution down to municipality</li>
                <li>• Household composition & occupation data</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg">
            <p className="text-sm text-gray-800">
              <strong>Combined Power:</strong> Match Statista's market intelligence with SynthiePop's population reality to identify under-served segments, optimize budget allocation, and predict campaign performance with unprecedented accuracy.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. Q1 Breakfast Cereal Promotion"
                  value={data.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Market Scope</Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="font-medium text-blue-800">Germany-wide Campaign</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    Starting with 83M+ population from SynthiePop. Geographic targeting will be configured in the Cohort Builder step.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Product Category</Label>
                {data.selectedProduct ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="font-medium text-green-800">{data.selectedProduct.category}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Inherited from selected product: {data.selectedProduct.name}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      Please select a product in the Brand & Product Selection step to automatically set the category.
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Category enables Statista market intelligence matching and SynthiePop population filtering
                </p>
              </div>

              <div className="space-y-3">
                <Label>Campaign Budget: {formatBudget(data.budget)}</Label>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="5000"
                  value={data.budget}
                  onChange={(e) => onUpdate({ budget: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>€10k</span>
                  <span>€1M</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="flight-length">Flight Length (days)</Label>
                <Input
                  id="flight-length"
                  type="number"
                  min="1"
                  max="365"
                  value={data.flightLength}
                  onChange={(e) => onUpdate({ flightLength: parseInt(e.target.value) || 30 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Collaboration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Team Collaboration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Invite Team Members</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="member-email"
                      type="email"
                      placeholder="email@company.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeamMember())}
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
                    <Button type="button" size="icon" onClick={addTeamMember}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {data.teamMembers.length > 0 && (
                  <div className="space-y-3">
                    <Label>Team Members ({data.teamMembers.length})</Label>
                    <div className="space-y-2">
                      {data.teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm">{member.name}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                              {member.role}
                            </Badge>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMember(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={!isValid} className="min-w-32">
            Next: Build Cohorts
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}