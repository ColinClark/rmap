import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, Target, Shield, BarChart3, Info, Crown, HelpCircle, Calculator, Database, AlertTriangle, Sliders, BarChart2, ArrowUpDown, Lightbulb } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Line, Area } from 'recharts';
import { Alert, AlertDescription } from './ui/alert';
import type { CampaignData } from '../types';

interface ComparativeDashboardProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type RankingMetric = 'roas' | 'reach' | 'risk' | 'efficiency';

interface SensitivityParams {
  cpm: number;
  aov: number;
  affinity: number;
}

export function ComparativeDashboard({ data, onUpdate, onNext, onPrev }: ComparativeDashboardProps) {
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('roas');
  const [selectedMethodologyStrategy, setSelectedMethodologyStrategy] = useState<string | null>(null);
  const [selectedComparisonStrategies, setSelectedComparisonStrategies] = useState<string[]>([]);
  const [sensitivityParams, setSensitivityParams] = useState<SensitivityParams>({
    cpm: 2.5, // Base CPM in euros
    aov: 7.8, // Base AOV in euros  
    affinity: 42 // Base affinity percentage
  });
  
  // Filter to only selected strategies
  const selectedStrategies = data.strategies.filter(s => 
    data.selectedStrategies?.includes(s.id)
  );

  // Calculate strategy performance with sensitivity adjustments
  const adjustedStrategies = useMemo(() => {
    return selectedStrategies.map(strategy => {
      // Apply sensitivity adjustments
      const cpmMultiplier = sensitivityParams.cpm / 2.5; // Base CPM is 2.5
      const aovMultiplier = sensitivityParams.aov / 7.8; // Base AOV is 7.8
      const affinityMultiplier = sensitivityParams.affinity / 42; // Base affinity is 42%
      
      const adjustedRoas = strategy.roas * (aovMultiplier / cpmMultiplier) * Math.pow(affinityMultiplier, 0.5);
      const adjustedReach = strategy.reach * Math.pow(affinityMultiplier, 0.3);
      const adjustedRisk = strategy.risk / affinityMultiplier;
      
      return {
        ...strategy,
        originalRoas: strategy.roas,
        originalReach: strategy.reach,
        originalRisk: strategy.risk,
        roas: Math.max(0.1, adjustedRoas),
        reach: Math.min(100, Math.max(1, adjustedReach)),
        risk: Math.min(100, Math.max(1, adjustedRisk))
      };
    });
  }, [selectedStrategies, sensitivityParams]);

  // Generate SHAP-style contribution data for strategies
  const getContributionAnalysis = (strategy: any) => {
    const baseRoas = 1.5;
    const baseReach = 20;
    
    return {
      roasContributions: [
        { factor: 'Brand Affinity', contribution: +(strategy.roas - baseRoas) * 0.4, color: '#22c55e' },
        { factor: 'Low CPM', contribution: +(strategy.roas - baseRoas) * 0.3, color: '#3b82f6' },
        { factor: 'Channel Mix', contribution: +(strategy.roas - baseRoas) * 0.2, color: '#f59e0b' },
        { factor: 'Geo Targeting', contribution: +(strategy.roas - baseRoas) * 0.1, color: '#8b5cf6' }
      ],
      reachContributions: [
        { factor: 'Broad Demographics', contribution: +(strategy.reach - baseReach) * 0.35, color: '#22c55e' },
        { factor: 'Multi-Channel', contribution: +(strategy.reach - baseReach) * 0.25, color: '#3b82f6' },
        { factor: 'Geo Coverage', contribution: +(strategy.reach - baseReach) * 0.25, color: '#f59e0b' },
        { factor: 'Platform Penetration', contribution: +(strategy.reach - baseReach) * 0.15, color: '#8b5cf6' }
      ]
    };
  };

  // Generate strategy narratives
  const getStrategyNarrative = (strategy: any) => {
    const contributions = getContributionAnalysis(strategy);
    const topRoasDriver = contributions.roasContributions.reduce((max, curr) => 
      Math.abs(curr.contribution) > Math.abs(max.contribution) ? curr : max
    );
    const topReachDriver = contributions.reachContributions.reduce((max, curr) => 
      Math.abs(curr.contribution) > Math.abs(max.contribution) ? curr : max
    );

    const channelText = strategy.channels.length > 1 ? 
      `multi-channel approach (${strategy.channels.join(', ')})` : 
      `focused ${strategy.channels[0]} strategy`;

    const performanceLevel = strategy.roas > 3.5 ? 'high' : strategy.roas > 2.5 ? 'medium' : 'conservative';
    
    return {
      whyItWorks: `Strategy "${strategy.name}" delivers ${performanceLevel} ROAS (${strategy.roas.toFixed(1)}x) through its ${channelText}. The primary driver is ${topRoasDriver.factor.toLowerCase()} contributing +${Math.abs(topRoasDriver.contribution).toFixed(1)} to ROAS. Reach of ${strategy.reach}% is primarily driven by ${topReachDriver.factor.toLowerCase()}.`,
      
      tradeOffs: [
        strategy.reach < 30 ? 'Limited reach due to narrow targeting' : 'Broad reach may dilute efficiency',
        strategy.channels.length > 3 ? 'High complexity with multi-channel management' : 'Simplified execution but limited diversification',
        strategy.risk > 40 ? 'Higher risk due to aggressive targeting' : 'Conservative approach with predictable outcomes'
      ],
      
      confidence: `${strategy.confidence}% confidence based on ${strategy.channels.length > 2 ? 'complex' : 'simple'} channel mix and ${strategy.reach > 50 ? 'broad' : 'narrow'} audience targeting.`
    };
  };

  // Comparison analysis for side-by-side strategies
  const getComparisonAnalysis = (strategy1: any, strategy2: any) => {
    const roasDiff = strategy1.roas - strategy2.roas;
    const reachDiff = strategy1.reach - strategy2.reach;
    const riskDiff = strategy1.risk - strategy2.risk;
    
    return {
      winner: roasDiff > 0 ? strategy1.name : strategy2.name,
      roasReason: roasDiff > 0 ? 
        `${strategy1.name} achieves ${Math.abs(roasDiff).toFixed(1)}x higher ROAS through better ${strategy1.channels.length > strategy2.channels.length ? 'channel diversification' : 'focused targeting'}` :
        `${strategy2.name} achieves ${Math.abs(roasDiff).toFixed(1)}x higher ROAS through better ${strategy2.channels.length > strategy1.channels.length ? 'channel diversification' : 'focused targeting'}`,
      
      reachReason: reachDiff > 0 ?
        `${strategy1.name} reaches ${Math.abs(reachDiff).toFixed(0)}% more audience due to ${strategy1.reach > 50 ? 'broader demographics' : 'optimized channel mix'}` :
        `${strategy2.name} reaches ${Math.abs(reachDiff).toFixed(0)}% more audience due to ${strategy2.reach > 50 ? 'broader demographics' : 'optimized channel mix'}`,
        
      riskTrade: riskDiff > 0 ?
        `${strategy1.name} carries ${Math.abs(riskDiff).toFixed(0)}% higher risk but may deliver better upside` :
        `${strategy2.name} carries ${Math.abs(riskDiff).toFixed(0)}% higher risk but may deliver better upside`
    };
  };

  // Prepare data for visualizations
  const paretoData = adjustedStrategies.map(strategy => ({
    name: strategy.name,
    shortName: strategy.name.split(' ')[0],
    roas: strategy.roas,
    reach: strategy.reach,
    risk: strategy.risk,
    efficiency: (strategy.roas * strategy.reach) / (strategy.risk + 10),
    id: strategy.id,
    isOriginal: Math.abs(strategy.roas - strategy.originalRoas) < 0.1
  }));

  // Channel distribution data
  const channelData = selectedStrategies.reduce((acc, strategy) => {
    strategy.channels.forEach(channel => {
      const channelName = channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!acc[channelName]) {
        acc[channelName] = { channel: channelName, count: 0, totalBudget: 0 };
      }
      acc[channelName].count += 1;
      acc[channelName].totalBudget += strategy.budget / strategy.channels.length;
    });
    return acc;
  }, {} as Record<string, { channel: string; count: number; totalBudget: number }>);

  const channelChartData = Object.values(channelData);

  // Risk vs Return analysis
  const riskReturnData = adjustedStrategies.map(strategy => ({
    name: strategy.name,
    risk: strategy.risk,
    return: strategy.roas,
    size: strategy.budget / 1000, // Bubble size based on budget
    id: strategy.id
  }));

  // Radar chart data
  const radarData = [
    {
      metric: 'ROAS',
      ...adjustedStrategies.reduce((acc, strategy) => {
        acc[strategy.name.split(' ')[0]] = (strategy.roas / 6) * 100;
        return acc;
      }, {} as Record<string, number>)
    },
    {
      metric: 'Reach',
      ...adjustedStrategies.reduce((acc, strategy) => {
        acc[strategy.name.split(' ')[0]] = strategy.reach;
        return acc;
      }, {} as Record<string, number>)
    },
    {
      metric: 'Confidence',
      ...adjustedStrategies.reduce((acc, strategy) => {
        acc[strategy.name.split(' ')[0]] = strategy.confidence;
        return acc;
      }, {} as Record<string, number>)
    },
    {
      metric: 'Low Risk',
      ...adjustedStrategies.reduce((acc, strategy) => {
        acc[strategy.name.split(' ')[0]] = 100 - strategy.risk;
        return acc;
      }, {} as Record<string, number>)
    },
    {
      metric: 'Efficiency',
      ...adjustedStrategies.reduce((acc, strategy) => {
        acc[strategy.name.split(' ')[0]] = Math.min(100, (strategy.roas * strategy.reach) / 10);
        return acc;
      }, {} as Record<string, number>)
    }
  ];

  // Ranking functions
  const getRankedStrategies = (metric: RankingMetric) => {
    const sorted = [...adjustedStrategies].sort((a, b) => {
      switch (metric) {
        case 'roas': return b.roas - a.roas;
        case 'reach': return b.reach - a.reach;
        case 'risk': return a.risk - b.risk;
        case 'efficiency': 
          const effA = (a.roas * a.reach) / (a.risk + 10);
          const effB = (b.roas * b.reach) / (b.risk + 10);
          return effB - effA;
        default: return 0;
      }
    });
    return sorted;
  };

  const selectFinalStrategy = (strategyId: string) => {
    onUpdate({ finalStrategy: strategyId });
  };

  const toggleComparisonStrategy = (strategyId: string) => {
    setSelectedComparisonStrategies(prev => {
      if (prev.includes(strategyId)) {
        return prev.filter(id => id !== strategyId);
      } else if (prev.length < 3) {
        return [...prev, strategyId];
      }
      return prev;
    });
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-600" />;
      case 2: return <Trophy className="h-4 w-4 text-gray-400" />;
      case 3: return <Trophy className="h-4 w-4 text-orange-600" />;
      default: return <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs">{rank}</div>;
    }
  };

  const rankedStrategies = getRankedStrategies(rankingMetric);
  const finalStrategy = adjustedStrategies.find(s => s.id === data.finalStrategy);
  const comparisonStrategies = adjustedStrategies.filter(s => selectedComparisonStrategies.includes(s.id));

  // Get strategy names for radar chart colors
  const strategyNames = adjustedStrategies.map(s => s.name.split(' ')[0]);
  const getStrategyColor = (index: number) => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[index % colors.length];
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2>Strategy Comparison Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Advanced analysis with explainability, sensitivity testing, and side-by-side comparisons.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>AI-Powered Analysis:</strong> Use the sensitivity sliders to test strategy robustness. Select strategies for detailed comparison and explainability analysis.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview & Rankings</TabsTrigger>
            <TabsTrigger value="explainability">Explainability Analysis</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity Testing</TabsTrigger>
            <TabsTrigger value="comparison">Side-by-Side Compare</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Strategy Selection Summary */}
            <Card className="bg-accent/30">
              <CardHeader>
                <CardTitle>Selected Strategies Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {adjustedStrategies.map((strategy, index) => (
                    <div
                      key={strategy.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        data.finalStrategy === strategy.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                      onClick={() => selectFinalStrategy(strategy.id)}
                    >
                      <div className="text-sm font-medium mb-2">{strategy.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">ROAS</div>
                          <div className={strategy.roas !== strategy.originalRoas ? 'text-blue-600' : ''}>
                            {strategy.roas.toFixed(1)}x
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Reach</div>
                          <div className={strategy.reach !== strategy.originalReach ? 'text-blue-600' : ''}>
                            {strategy.reach.toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Risk</div>
                          <div className={strategy.risk !== strategy.originalRisk ? 'text-blue-600' : ''}>
                            {strategy.risk.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      {data.finalStrategy === strategy.id && (
                        <Badge className="mt-2 w-full justify-center">Selected for Implementation</Badge>
                      )}
                      {strategy.roas !== strategy.originalRoas && (
                        <Badge variant="outline" className="mt-2 w-full justify-center text-blue-600">
                          Sensitivity Adjusted
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rankings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>Strategy Rankings</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs space-y-2">
                          <p><strong>ROAS:</strong> Return on Ad Spend - higher is better</p>
                          <p><strong>Reach:</strong> Percentage of target audience reached</p>
                          <p><strong>Risk:</strong> Lower risk strategies are more predictable</p>
                          <p><strong>Efficiency:</strong> Composite score balancing ROAS, reach, and risk</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={rankingMetric} onValueChange={(value: RankingMetric) => setRankingMetric(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roas">Rank by ROAS</SelectItem>
                      <SelectItem value="reach">Rank by Reach</SelectItem>
                      <SelectItem value="risk">Rank by Risk (Lower Better)</SelectItem>
                      <SelectItem value="efficiency">Rank by Efficiency Score</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rankedStrategies.map((strategy, index) => (
                    <div
                      key={strategy.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer ${
                        data.finalStrategy === strategy.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-accent/30 hover:bg-accent/50'
                      }`}
                      onClick={() => selectFinalStrategy(strategy.id)}
                    >
                      <div className="flex items-center space-x-4">
                        {getRankIcon(index + 1)}
                        <div>
                          <div className="font-medium">{strategy.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {strategy.channels.length} channel{strategy.channels.length !== 1 ? 's' : ''} • 
                            €{(strategy.budget / 1000).toFixed(0)}k budget
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${getRankColor(index + 1)}`}>
                          {rankingMetric === 'roas' && `${strategy.roas.toFixed(1)}x`}
                          {rankingMetric === 'reach' && `${strategy.reach.toFixed(0)}%`}
                          {rankingMetric === 'risk' && `${strategy.risk.toFixed(0)}%`}
                          {rankingMetric === 'efficiency' && `${((strategy.roas * strategy.reach) / (strategy.risk + 10)).toFixed(1)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rankingMetric === 'roas' && 'ROAS'}
                          {rankingMetric === 'reach' && 'Reach'}
                          {rankingMetric === 'risk' && 'Risk'}
                          {rankingMetric === 'efficiency' && 'Efficiency'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts Grid - All 4 charts restored */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pareto Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Pareto Analysis: ROAS vs Reach</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm space-y-2">
                          <p><strong>What is Pareto Analysis?</strong></p>
                          <p>Pareto analysis helps identify optimal strategies by plotting two key metrics against each other.</p>
                          <p><strong>How to read:</strong> Strategies in the top-right corner offer the best combination of high ROAS and high reach.</p>
                          <p><strong>The ideal strategy:</strong> Maximizes both metrics without major trade-offs.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={paretoData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="reach" name="Reach %" domain={[0, 100]} />
                      <YAxis dataKey="roas" name="ROAS" domain={[0, 6]} />
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          name === 'roas' ? `${Number(value).toFixed(1)}x` : `${value.toFixed(0)}%`,
                          name === 'roas' ? 'ROAS' : 'Reach'
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ''}
                      />
                      <Scatter dataKey="roas">
                        {paretoData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={!entry.isOriginal ? '#3b82f6' : data.finalStrategy === entry.id ? '#22c55e' : '#64748b'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Strategies closer to top-right corner offer better performance balance
                  </div>
                </CardContent>
              </Card>

              {/* Risk vs Return - RESTORED */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Risk vs Return Analysis</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm space-y-2">
                          <p><strong>Risk vs Return Analysis</strong></p>
                          <p>This scatter plot shows the relationship between campaign risk and expected returns (ROAS).</p>
                          <p><strong>Bottom-right quadrant:</strong> High return, low risk (ideal)</p>
                          <p><strong>Top-right quadrant:</strong> High return, high risk (aggressive)</p>
                          <p><strong>Bottom-left quadrant:</strong> Low return, low risk (conservative)</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={riskReturnData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="risk" name="Risk %" domain={[0, 100]} />
                      <YAxis dataKey="return" name="ROAS" domain={[0, 6]} />
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          name === 'return' ? `${Number(value).toFixed(1)}x` : `${value}%`,
                          name === 'return' ? 'ROAS' : 'Risk'
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ''}
                      />
                      <Scatter dataKey="return">
                        {riskReturnData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={data.finalStrategy === entry.id ? '#3b82f6' : '#64748b'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Look for strategies with high ROAS (Y-axis) and lower risk (left side)
                  </div>
                </CardContent>
              </Card>

              {/* Multi-dimensional Radar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Multi-Dimensional Comparison</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm space-y-2">
                          <p><strong>Radar Chart Explanation</strong></p>
                          <p>This chart compares strategies across 5 dimensions simultaneously. Each colored line represents one strategy.</p>
                          <p><strong>Larger shapes:</strong> Better overall performance</p>
                          <p><strong>Compare shapes:</strong> See where each strategy excels or lags</p>
                          <p>All metrics are normalized to 0-100 scale for fair comparison.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      {strategyNames.map((strategyName, index) => (
                        <Radar
                          key={strategyName}
                          name={strategyName}
                          dataKey={strategyName}
                          stroke={getStrategyColor(index)}
                          fill={getStrategyColor(index)}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex justify-center flex-wrap gap-4 mt-4">
                    {strategyNames.map((name, index) => (
                      <div key={name} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getStrategyColor(index) }}
                        />
                        <span className="text-sm">{name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Larger, more balanced shapes indicate stronger overall performance
                  </div>
                </CardContent>
              </Card>

              {/* Channel Distribution - RESTORED */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Channel Usage Across Strategies</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm space-y-2">
                          <p><strong>Channel Usage Analysis</strong></p>
                          <p>This bar chart shows how frequently each media channel appears across your selected strategies.</p>
                          <p><strong>Higher bars:</strong> Channels used by more strategies (popular/effective)</p>
                          <p><strong>Use this to:</strong> Identify the most commonly recommended channels and understand channel diversification across strategies.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="channel" />
                      <YAxis />
                      <RechartsTooltip formatter={(value, name) => [
                        name === 'count' ? `${value} strategies` : `€${(Number(value) / 1000).toFixed(0)}k`,
                        name === 'count' ? 'Usage Count' : 'Total Budget'
                      ]} />
                      <Bar dataKey="count" fill="#3b82f6" name="Usage Count" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Channels with higher usage indicate AI confidence in their effectiveness
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Explainability Tab */}
          <TabsContent value="explainability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Strategy Explainability Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {adjustedStrategies.map(strategy => {
                    const contributions = getContributionAnalysis(strategy);
                    const narrative = getStrategyNarrative(strategy);
                    
                    return (
                      <div key={strategy.id} className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium">{strategy.name}</h4>
                          <div className="flex items-center space-x-4">
                            <Badge>{strategy.roas.toFixed(1)}x ROAS</Badge>
                            <Badge variant="outline">{strategy.reach.toFixed(0)}% Reach</Badge>
                          </div>
                        </div>
                        
                        {/* Why it works narrative */}
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Why This Strategy Works</h5>
                          <p className="text-sm text-green-700">{narrative.whyItWorks}</p>
                        </div>

                        {/* ROAS and Reach drivers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium mb-3">ROAS Drivers</h5>
                            <div className="space-y-2">
                              {contributions.roasContributions.map((contrib, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                  <div className="w-24 text-sm">{contrib.factor}</div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                    <div 
                                      className="h-4 rounded-full transition-all"
                                      style={{ 
                                        backgroundColor: contrib.color,
                                        width: `${Math.abs(contrib.contribution) * 50}%`,
                                        marginLeft: contrib.contribution < 0 ? `${50 - Math.abs(contrib.contribution) * 50}%` : '50%'
                                      }}
                                    />
                                  </div>
                                  <div className="w-16 text-sm text-right">
                                    {contrib.contribution > 0 ? '+' : ''}{contrib.contribution.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-3">Reach Drivers</h5>
                            <div className="space-y-2">
                              {contributions.reachContributions.map((contrib, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                  <div className="w-24 text-sm">{contrib.factor}</div>
                                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                    <div 
                                      className="h-4 rounded-full transition-all"
                                      style={{ 
                                        backgroundColor: contrib.color,
                                        width: `${Math.abs(contrib.contribution) * 3}%`,
                                        marginLeft: contrib.contribution < 0 ? `${50 - Math.abs(contrib.contribution) * 3}%` : '50%'
                                      }}
                                    />
                                  </div>
                                  <div className="w-16 text-sm text-right">
                                    {contrib.contribution > 0 ? '+' : ''}{contrib.contribution.toFixed(1)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Trade-offs */}
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Key Trade-offs</h5>
                          <ul className="text-sm text-amber-700 space-y-1">
                            {narrative.tradeOffs.map((tradeoff, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span>•</span>
                                <span>{tradeoff}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Confidence */}
                        <div className="text-sm text-muted-foreground">
                          <strong>Confidence:</strong> {narrative.confidence}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensitivity Tab */}
          <TabsContent value="sensitivity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sliders className="h-5 w-5" />
                  <span>Interactive Sensitivity Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Adjust market parameters to test strategy robustness. Blue values indicate adjusted metrics.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block">
                        CPM (Cost per Mille): €{sensitivityParams.cpm.toFixed(2)}
                      </label>
                      <Slider
                        value={[sensitivityParams.cpm]}
                        onValueChange={([value]) => setSensitivityParams(prev => ({ ...prev, cpm: value }))}
                        min={1.0}
                        max={5.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">€1.00 - €5.00</div>
                    </div>

                    <div className="space-y-3">
                      <label className="block">
                        AOV (Average Order Value): €{sensitivityParams.aov.toFixed(2)}
                      </label>
                      <Slider
                        value={[sensitivityParams.aov]}
                        onValueChange={([value]) => setSensitivityParams(prev => ({ ...prev, aov: value }))}
                        min={3.0}
                        max={15.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">€3.00 - €15.00</div>
                    </div>

                    <div className="space-y-3">
                      <label className="block">
                        Brand Affinity: {sensitivityParams.affinity}%
                      </label>
                      <Slider
                        value={[sensitivityParams.affinity]}
                        onValueChange={([value]) => setSensitivityParams(prev => ({ ...prev, affinity: value }))}
                        min={10}
                        max={80}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">10% - 80%</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h5 className="font-medium mb-3">Strategy Robustness Analysis</h5>
                    <div className="space-y-3">
                      {adjustedStrategies.map(strategy => {
                        const roasChange = ((strategy.roas - strategy.originalRoas) / strategy.originalRoas) * 100;
                        const reachChange = ((strategy.reach - strategy.originalReach) / strategy.originalReach) * 100;
                        const robustness = Math.abs(roasChange) < 10 ? 'Robust' : Math.abs(roasChange) < 25 ? 'Moderate' : 'Fragile';
                        const robustnessColor = robustness === 'Robust' ? 'text-green-600' : robustness === 'Moderate' ? 'text-yellow-600' : 'text-red-600';
                        
                        return (
                          <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <div className="font-medium">{strategy.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ROAS: {strategy.originalRoas.toFixed(1)}x → {strategy.roas.toFixed(1)}x 
                                ({roasChange > 0 ? '+' : ''}{roasChange.toFixed(1)}%)
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${robustnessColor}`}>{robustness}</div>
                              <div className="text-xs text-muted-foreground">
                                {Math.abs(roasChange).toFixed(1)}% sensitivity
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUpDown className="h-5 w-5" />
                  <span>Side-by-Side Strategy Comparison</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h5 className="font-medium mb-3">Select Strategies to Compare (2-3 strategies)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {adjustedStrategies.map(strategy => (
                        <div
                          key={strategy.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedComparisonStrategies.includes(strategy.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleComparisonStrategy(strategy.id)}
                        >
                          <div className="font-medium text-sm">{strategy.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {strategy.roas.toFixed(1)}x ROAS • {strategy.reach.toFixed(0)}% Reach
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {comparisonStrategies.length >= 2 && (
                    <div className="space-y-6">
                      {comparisonStrategies.slice(0, -1).map((strategy1, idx) => {
                        const strategy2 = comparisonStrategies[idx + 1];
                        const analysis = getComparisonAnalysis(strategy1, strategy2);
                        
                        return (
                          <div key={`${strategy1.id}-${strategy2.id}`} className="border rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-medium">
                                {strategy1.name} vs {strategy2.name}
                              </h5>
                              <Badge className="bg-green-100 text-green-800">
                                Winner: {analysis.winner}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h6 className="font-medium text-sm mb-2">{strategy1.name}</h6>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span>ROAS</span>
                                      <span className="font-medium">{strategy1.roas.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Reach</span>
                                      <span className="font-medium">{strategy1.reach.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Risk</span>
                                      <span className="font-medium">{strategy1.risk.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Channels</span>
                                      <span className="text-sm">{strategy1.channels.length}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h6 className="font-medium text-sm mb-2">{strategy2.name}</h6>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span>ROAS</span>
                                      <span className="font-medium">{strategy2.roas.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Reach</span>
                                      <span className="font-medium">{strategy2.reach.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Risk</span>
                                      <span className="font-medium">{strategy2.risk.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Channels</span>
                                      <span className="text-sm">{strategy2.channels.length}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 space-y-3">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <h6 className="font-medium text-blue-800 text-sm">ROAS Analysis</h6>
                                <p className="text-sm text-blue-700">{analysis.roasReason}</p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <h6 className="font-medium text-green-800 text-sm">Reach Analysis</h6>
                                <p className="text-sm text-green-700">{analysis.reachReason}</p>
                              </div>
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <h6 className="font-medium text-yellow-800 text-sm">Risk Trade-off</h6>
                                <p className="text-sm text-yellow-700">{analysis.riskTrade}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {comparisonStrategies.length < 2 && (
                    <div className="text-center text-muted-foreground py-8">
                      Select at least 2 strategies to see detailed comparison analysis.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Final Strategy Summary */}
        {finalStrategy && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-primary" />
                <span>Selected for Implementation: {finalStrategy.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-primary">{finalStrategy.roas.toFixed(1)}x</div>
                  <div className="text-sm text-muted-foreground">ROAS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl">{finalStrategy.reach.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Reach</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl">{finalStrategy.risk.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl">{finalStrategy.confidence}%</div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {finalStrategy.channels.map(channel => (
                    <Badge key={channel} variant="outline">
                      {channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button onClick={onNext} disabled={!data.finalStrategy} className="min-w-32">
            Finalize & Export
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}