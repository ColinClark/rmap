import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, TrendingUp, Eye, DollarSign } from 'lucide-react';
import { CampaignData } from '../App';

interface ReachEstimatorProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const mediaChannels = [
  { value: 'in-store-screens', label: 'In-Store Digital Screens', baseCPM: 12 },
  { value: 'retail-app', label: 'Retail Mobile App', baseCPM: 8 },
  { value: 'loyalty-program', label: 'Loyalty Program Emails', baseCPM: 3 },
  { value: 'receipt-ads', label: 'Digital Receipt Ads', baseCPM: 5 },
  { value: 'shelf-displays', label: 'Smart Shelf Displays', baseCPM: 15 }
];

export function ReachEstimator({ data, onUpdate, onNext, onPrev }: ReachEstimatorProps) {
  // Calculate reach metrics based on budget and channel
  useEffect(() => {
    if (data.mediaChannel && data.budget) {
      const channel = mediaChannels.find(c => c.value === data.mediaChannel);
      if (channel) {
        const cpm = channel.baseCPM;
        const impressions = Math.floor((data.budget / cpm) * 1000);
        const uniqueUsers = Math.min(impressions * 0.7, data.audienceSize); // 70% reach efficiency
        const reachPercentage = Math.floor((uniqueUsers / data.audienceSize) * 100);
        
        onUpdate({
          impressions,
          reach: reachPercentage,
          cpm
        });
      }
    }
  }, [data.mediaChannel, data.budget, data.audienceSize, onUpdate]);

  const formatBudget = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}k`;
    }
    return `€${value}`;
  };

  const selectedChannel = mediaChannels.find(c => c.value === data.mediaChannel);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2>Reach Estimator</h2>
        <p className="text-muted-foreground mt-2">
          Select your media channel and budget to estimate campaign reach and performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel & Budget Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Media Planning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Media Channel</Label>
              <Select 
                value={data.mediaChannel} 
                onValueChange={(value) => onUpdate({ mediaChannel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a media channel" />
                </SelectTrigger>
                <SelectContent>
                  {mediaChannels.map((channel) => (
                    <SelectItem key={channel.value} value={channel.value}>
                      <div className="flex justify-between items-center w-full">
                        <span>{channel.label}</span>
                        <span className="text-sm text-muted-foreground ml-4">
                          €{channel.baseCPM} CPM
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Campaign Budget: {formatBudget(data.budget)}</Label>
              <Slider
                value={[data.budget]}
                onValueChange={(value) => onUpdate({ budget: value[0] })}
                min={10000}
                max={1000000}
                step={5000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>€10k</span>
                <span>€1M</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Details */}
        {selectedChannel && (
          <Card>
            <CardHeader>
              <CardTitle>Channel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Selected Channel</div>
                <div>{selectedChannel.label}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Base CPM</div>
                <div>€{selectedChannel.baseCPM}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Channel Benefits</div>
                <ul className="text-sm space-y-1 mt-1">
                  {data.mediaChannel === 'in-store-screens' && (
                    <>
                      <li>• High attention at point of purchase</li>
                      <li>• Location-based targeting</li>
                      <li>• Real-time campaign updates</li>
                    </>
                  )}
                  {data.mediaChannel === 'retail-app' && (
                    <>
                      <li>• Personalized user experience</li>
                      <li>• Rich engagement metrics</li>
                      <li>• Cross-device tracking</li>
                    </>
                  )}
                  {data.mediaChannel === 'loyalty-program' && (
                    <>
                      <li>• Highly engaged audience</li>
                      <li>• Purchase history insights</li>
                      <li>• Cost-effective reach</li>
                    </>
                  )}
                  {data.mediaChannel === 'receipt-ads' && (
                    <>
                      <li>• Post-purchase engagement</li>
                      <li>• Transaction-triggered ads</li>
                      <li>• Competitive intelligence</li>
                    </>
                  )}
                  {data.mediaChannel === 'shelf-displays' && (
                    <>
                      <li>• Category-specific targeting</li>
                      <li>• Interactive product demos</li>
                      <li>• Shopper behavior analytics</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reach Results */}
      {data.impressions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
              <div className="text-3xl text-primary">{data.impressions.toLocaleString()}</div>
              <div className="text-muted-foreground">Total Impressions</div>
            </CardContent>
          </Card>

          <Card className="bg-accent/50">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-foreground mx-auto mb-4" />
              <div className="text-3xl">{data.reach}%</div>
              <div className="text-muted-foreground">Audience Reach</div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/50">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 text-foreground mx-auto mb-4" />
              <div className="text-3xl">€{data.cpm}</div>
              <div className="text-muted-foreground">Effective CPM</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onNext} disabled={!data.mediaChannel} className="min-w-32">
          Simulate ROAS
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}