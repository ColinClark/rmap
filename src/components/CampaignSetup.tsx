import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronRight } from 'lucide-react';
import { CampaignData } from '../App';

interface CampaignSetupProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
}

// Removed regions array - geographic targeting handled in Cohort Builder

// Categories are now derived from selected product - no manual selection needed

export function CampaignSetup({ data, onUpdate, onNext }: CampaignSetupProps) {
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
    <div className="max-w-6xl mx-auto space-y-6">
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
        {/* Campaign Details - Full Width Card */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:gap-12">
              {/* Left Column */}
              <div className="flex-1 space-y-6 md:pr-12 md:border-r border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g. Q1 Breakfast Cereal Promotion"
                    value={data.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Market Scope</Label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium text-blue-800">Germany-wide Campaign</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      Starting with 83M+ population from SynthiePop. Geographic targeting will be configured in the Cohort Builder step.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Product Category</Label>
                  {data.selectedProduct ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="font-medium text-green-800">{data.selectedProduct.category}</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Inherited from selected product: {data.selectedProduct.name}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        Please select a product in the Brand & Product Selection step to automatically set the category.
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Category enables Statista market intelligence matching and SynthiePop population filtering
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-1 space-y-6 md:pl-12 mt-6 md:mt-0">
                <div className="space-y-2">
                  <Label htmlFor="campaign-budget">Campaign Budget</Label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium text-blue-800 text-xl">{formatBudget(data.budget)}</span>
                    </div>
                    <div className="space-y-3">
                      <input
                        id="campaign-budget"
                        type="range"
                        min="10000"
                        max="1000000"
                        step="5000"
                        value={data.budget}
                        onChange={(e) => onUpdate({ budget: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>€10k</span>
                        <span>€500k</span>
                        <span>€1M</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ budget: 50000 })}
                          className="hover:bg-blue-100"
                        >
                          €50k
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ budget: 250000 })}
                          className="hover:bg-blue-100"
                        >
                          €250k
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ budget: 500000 })}
                          className="hover:bg-blue-100"
                        >
                          €500k
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Set your total campaign investment budget
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flight-length">Flight Length</Label>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="font-medium text-green-800 text-xl">{data.flightLength} days</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Input
                          id="flight-length"
                          type="number"
                          min="1"
                          max="365"
                          value={data.flightLength}
                          onChange={(e) => onUpdate({ flightLength: parseInt(e.target.value) || 30 })}
                          className="w-32"
                        />
                        <span className="text-green-700 text-sm">days</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ flightLength: 7 })}
                          className="hover:bg-green-100"
                        >
                          1 week
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ flightLength: 30 })}
                          className="hover:bg-green-100"
                        >
                          1 month
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdate({ flightLength: 90 })}
                          className="hover:bg-green-100"
                        >
                          3 months
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Duration of your campaign flight
                  </p>
                </div>

                <div className="pt-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg">
                    <h4 className="font-medium mb-2">Campaign Overview</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Budget:</span>
                        <span className="font-medium">€{Math.round(data.budget / data.flightLength).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Campaign Duration:</span>
                        <span className="font-medium">{data.flightLength} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Investment:</span>
                        <span className="font-medium">{formatBudget(data.budget)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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