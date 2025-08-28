import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ChevronLeft, Download, Copy, Send, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { toast } from 'sonner@2.0.3';
import { CampaignData } from '../App';

interface ROASSimulatorProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onPrev: () => void;
}

export function ROASSimulator({ data, onUpdate, onPrev }: ROASSimulatorProps) {
  const [roasData, setRoasData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    // Calculate ROAS based on campaign metrics
    const baseConversionRate = 0.02; // 2% base conversion
    const channelMultiplier = data.mediaChannel === 'in-store-screens' ? 1.5 : 
                             data.mediaChannel === 'retail-app' ? 1.3 :
                             data.mediaChannel === 'loyalty-program' ? 1.8 : 1.2;
    
    const affinityMultiplier = 1 + (data.affinityPercentage / 100);
    const effectiveConversionRate = baseConversionRate * channelMultiplier * affinityMultiplier;
    
    const conversions = Math.floor(data.impressions * effectiveConversionRate);
    const avgOrderValue = 45; // €45 average order
    const revenue = conversions * avgOrderValue;
    const roas = revenue / data.budget;
    
    // Determine ROI level
    let roiLevel = 'low';
    if (roas >= 3) roiLevel = 'high';
    else if (roas >= 1.5) roiLevel = 'medium';
    
    onUpdate({ roiLevel });

    // Generate chart data
    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
    const chartData = months.map((month, index) => ({
      name: month,
      spend: data.budget / 6,
      revenue: revenue / 6 * (1 + index * 0.1), // Growing revenue
      roas: (revenue / 6 * (1 + index * 0.1)) / (data.budget / 6)
    }));

    setRoasData(chartData);

    // Pie chart data
    setPieData([
      { name: 'Media Spend', value: data.budget, color: '#f97316' },
      { name: 'Expected Revenue', value: revenue, color: '#22c55e' },
      { name: 'Profit', value: Math.max(0, revenue - data.budget), color: '#3b82f6' }
    ]);
  }, [data, onUpdate]);

  const exportToCsv = () => {
    const csvContent = [
      ['Campaign Name', data.name],
      ['Region', data.region],
      ['Category', data.category],
      ['Audience Size', data.audienceSize],
      ['Budget', data.budget],
      ['Media Channel', data.mediaChannel],
      ['Impressions', data.impressions],
      ['Reach %', data.reach],
      ['CPM', data.cpm],
      ['ROI Level', data.roiLevel]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_')}_campaign_plan.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Campaign data exported to CSV');
  };

  const copyApiCall = () => {
    const apiCall = {
      method: 'POST',
      url: '/api/campaigns',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY_HERE'
      },
      body: JSON.stringify({
        campaign: {
          name: data.name,
          region: data.region,
          category: data.category,
          audience: {
            size: data.audienceSize,
            demographics: data.demographics,
            brandAffinity: data.brandAffinity
          },
          media: {
            channel: data.mediaChannel,
            budget: data.budget,
            estimatedImpressions: data.impressions,
            estimatedReach: data.reach,
            cpm: data.cpm
          },
          projectedROI: data.roiLevel
        }
      })
    };

    navigator.clipboard.writeText(JSON.stringify(apiCall, null, 2));
    toast.success('API call copied to clipboard');
  };

  const sendToDashboard = () => {
    // Simulate sending to dashboard
    toast.success('Campaign plan sent to dashboard');
  };

  const getRoiColor = () => {
    switch (data.roiLevel) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getRoiProgress = () => {
    switch (data.roiLevel) {
      case 'high': return 85;
      case 'medium': return 60;
      default: return 30;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2>ROAS Simulator & Export</h2>
        <p className="text-muted-foreground mt-2">
          Review your campaign's projected return on ad spend and export your planning data.
        </p>
      </div>

      {/* ROI Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>ROI Projection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className={`text-6xl ${getRoiColor()}`}>
              {data.roiLevel.charAt(0).toUpperCase() + data.roiLevel.slice(1)}
            </div>
            <Progress value={getRoiProgress()} className="w-full max-w-md mx-auto h-4" />
            <div className="flex justify-between text-sm text-muted-foreground max-w-md mx-auto">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spend vs Revenue Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={roasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`€${typeof value === 'number' ? value.toLocaleString() : value}`, name]} />
                <Line type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={3} name="Media Spend" />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `€${typeof value === 'number' ? value.toLocaleString() : value}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Campaign Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={exportToCsv} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={copyApiCall} variant="outline" className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Copy JSON API Call
            </Button>
            <Button onClick={sendToDashboard} variant="outline" className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Send to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
      </div>
    </div>
  );
}