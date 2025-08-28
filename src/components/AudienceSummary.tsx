import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Users, Target, MapPin, Tag, Edit3 } from 'lucide-react';
import { CampaignData } from '../App';

interface AudienceSummaryProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function AudienceSummary({ data, onUpdate, onNext, onPrev }: AudienceSummaryProps) {
  const formatAgeRange = () => {
    return `${data.demographics.ageRange[0]}-${data.demographics.ageRange[1]} years`;
  };

  const formatHouseholdSize = () => {
    return `${data.demographics.householdSize[0]}-${data.demographics.householdSize[1]} people`;
  };

  const formatIncome = () => {
    const incomeMap = {
      low: 'Low Income (<€30k)',
      middle: 'Middle Income (€30k-€70k)',
      high: 'High Income (>€70k)'
    };
    return incomeMap[data.demographics.incomeLevel as keyof typeof incomeMap];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2>Audience Summary</h2>
        <p className="text-muted-foreground mt-2">
          Review your target audience and make any final adjustments before proceeding.
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="text-3xl text-primary">{data.audienceSize.toLocaleString()}</div>
            <div className="text-muted-foreground">Total Population</div>
          </CardContent>
        </Card>

        <Card className="bg-accent/50">
          <CardContent className="p-6 text-center">
            <Target className="h-12 w-12 text-foreground mx-auto mb-4" />
            <div className="text-3xl">{data.affinityPercentage}%</div>
            <div className="text-muted-foreground">Brand Affinity</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-foreground mx-auto mb-4" />
            <div className="text-xl">{Math.floor(data.audienceSize * (data.affinityPercentage / 100)).toLocaleString()}</div>
            <div className="text-muted-foreground">Overlap Count</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campaign Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Campaign Name</div>
              <div>{data.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Region</div>
              <div>{data.region}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Category</div>
              <div>{data.category}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Demographics</CardTitle>
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Age Range</div>
              <div>{formatAgeRange()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gender</div>
              <div className="flex flex-wrap gap-2">
                {data.demographics.gender.length > 0 ? (
                  data.demographics.gender.map((gender) => (
                    <Badge key={gender} variant="secondary">{gender}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">All</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Household Size</div>
              <div>{formatHouseholdSize()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Income Level</div>
              <div>{formatIncome()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Affinity */}
      {(data.brandAffinity.brand || data.brandAffinity.platform.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Brand Affinity</CardTitle>
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <Edit3 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.brandAffinity.brand && (
              <div>
                <div className="text-sm text-muted-foreground">Preferred Brand</div>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>{data.brandAffinity.brand}</span>
                </div>
              </div>
            )}
            {data.brandAffinity.platform.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Active Platforms</div>
                <div className="flex flex-wrap gap-2">
                  {data.brandAffinity.platform.map((platform) => (
                    <Badge key={platform} variant="outline">{platform}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Edit Audience
        </Button>
        <Button onClick={onNext} className="min-w-32">
          Estimate Reach
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}