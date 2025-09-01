import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { 
  ChevronLeft, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  PauseCircle, 
  PlayCircle, 
  RefreshCw,
  Target,
  DollarSign,
  Eye,
  BarChart3,
  Sliders,
  Bell,
  Calendar,
  Download,
  MessageSquare,
  Bot,
  User,
  Users,
  Send,
  Lightbulb,
  Zap,
  Brain,
  Sparkles,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  ComposedChart,
  Area,
  AreaChart,
  PieChart,
  Pie
} from 'recharts';
import { CampaignData, ChannelPerformance, PerformanceAlert, PerformanceChatMessage, AIPerformanceInsight } from '../App';

interface PerformanceMonitoringProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onPrev: () => void;
}

export function PerformanceMonitoring({ data, onUpdate, onPrev }: PerformanceMonitoringProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  
  // AI Chat states
  const [chatMessage, setChatMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);

  // Generate mock real-time performance data
  const generateMockPerformanceData = () => {
    // Use finalStrategy if available, otherwise create mock strategy for demo
    let finalStrategy = data.strategies.find(s => s.id === data.finalStrategy);
    
    if (!finalStrategy && data.strategies.length > 0) {
      finalStrategy = data.strategies[0]; // Use first strategy as fallback
    }
    
    if (!finalStrategy) {
      // Create a mock strategy for demonstration
      finalStrategy = {
        id: 'demo-strategy',
        name: 'Demo Strategy',
        channels: ['google-ads', 'facebook-ads', 'amazon-dsp', 'youtube-ads'],
        budget: data.budget || 50000,
        roas: 3.2,
        reach: 75,
        risk: 25,
        impressions: 2500000,
        cpm: 12.5,
        confidence: 85,
        cohorts: []
      };
    }

    // Generate channel performance data based on the final strategy
    const mockChannelPerformance: ChannelPerformance[] = finalStrategy.channels.map((channel, index) => {
      const budgetAllocation = data.budget / finalStrategy.channels.length;
      const daysElapsed = Math.min(7, data.flightLength); // Simulate 7 days of campaign running
      const progressFactor = daysElapsed / data.flightLength;
      
      // Add some variance to make it realistic
      const performanceVariance = 0.8 + (Math.random() * 0.4); // 80% to 120% of planned
      const spendPacing = 0.9 + (Math.random() * 0.2); // 90% to 110% of planned spend pace
      
      return {
        channelId: `${channel}-${index}`,
        channelName: channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        budgetAllocated: budgetAllocation,
        budgetSpent: budgetAllocation * progressFactor * spendPacing,
        impressionsPlanned: (finalStrategy.impressions / finalStrategy.channels.length) * progressFactor,
        impressionsActual: (finalStrategy.impressions / finalStrategy.channels.length) * progressFactor * performanceVariance,
        reachPlanned: (finalStrategy.reach / finalStrategy.channels.length) * progressFactor,
        reachActual: (finalStrategy.reach / finalStrategy.channels.length) * progressFactor * performanceVariance,
        roasPlanned: finalStrategy.roas,
        roasActual: finalStrategy.roas * performanceVariance,
        cpmPlanned: finalStrategy.cpm,
        cpmActual: finalStrategy.cpm / performanceVariance, // Lower CPM = better performance
        status: performanceVariance > 1.1 ? 'overperforming' : 
                performanceVariance < 0.9 ? 'underperforming' : 'active',
        lastUpdated: new Date(),
        campaignId: `camp_${channel}_${Math.random().toString(36).substr(2, 9)}`
      };
    });

    // Generate alerts based on performance
    const alerts: PerformanceAlert[] = [];
    mockChannelPerformance.forEach(channel => {
      if (channel.status === 'underperforming') {
        alerts.push({
          id: `alert_${channel.channelId}`,
          type: 'performance',
          severity: 'medium',
          message: `${channel.channelName} is underperforming expected ROAS by ${((channel.roasPlanned - channel.roasActual) / channel.roasPlanned * 100).toFixed(1)}%`,
          channelId: channel.channelId,
          threshold: channel.roasPlanned,
          actualValue: channel.roasActual,
          timestamp: new Date(),
          acknowledged: false
        });
      }
      
      if (channel.budgetSpent / channel.budgetAllocated > 0.8) {
        alerts.push({
          id: `budget_${channel.channelId}`,
          type: 'budget',
          severity: 'low',
          message: `${channel.channelName} has spent ${((channel.budgetSpent / channel.budgetAllocated) * 100).toFixed(1)}% of allocated budget`,
          channelId: channel.channelId,
          threshold: 0.8,
          actualValue: channel.budgetSpent / channel.budgetAllocated,
          timestamp: new Date(),
          acknowledged: false
        });
      }
    });

    // Calculate overall performance
    const totalSpent = mockChannelPerformance.reduce((sum, ch) => sum + ch.budgetSpent, 0);
    const totalImpressions = mockChannelPerformance.reduce((sum, ch) => sum + ch.impressionsActual, 0);
    const totalReach = Math.min(100, mockChannelPerformance.reduce((sum, ch) => sum + ch.reachActual, 0));
    const weightedRoas = mockChannelPerformance.reduce((sum, ch) => 
      sum + (ch.roasActual * (ch.budgetSpent / totalSpent)), 0
    );

    // Generate AI insights based on performance data
    const aiInsights = generateAIInsights(mockChannelPerformance, alerts, weightedRoas);
    
    // Add initial AI system message if this is the first time
    const initialMessages = data.performanceChatMessages.length === 0 ? [{
      id: 'system-1',
      type: 'system' as const,
      content: `🚀 Campaign "${data.name}" is now live! I'm your AI Performance Analyst and I'll help you monitor and optimize your campaign in real-time. I can explain performance variations, suggest budget reallocations, and help you make data-driven decisions.`,
      timestamp: new Date()
    }] : [];

    onUpdate({
      channelPerformance: mockChannelPerformance,
      performanceAlerts: alerts,
      aiPerformanceInsights: [...data.aiPerformanceInsights, ...aiInsights],
      performanceChatMessages: [...data.performanceChatMessages, ...initialMessages],
      overallPerformance: {
        totalSpend: totalSpent,
        totalImpressions: totalImpressions,
        totalReach: totalReach,
        overallRoas: weightedRoas,
        campaignProgress: (totalSpent / data.budget) * 100,
        daysRemaining: Math.max(0, data.flightLength - 7),
        lastUpdated: new Date()
      },
      activation: {
        ...data.activation,
        status: 'active'
      }
    });
  };

  // Auto-refresh effect - Initialize data when component loads OR when activated
  useEffect(() => {
    // Initialize mock data when component first loads, regardless of activation status
    // This ensures we have data to show for demonstration purposes
    if (data.channelPerformance.length === 0 && (data.strategies.length > 0 || data.activation.status === 'draft')) {
      generateMockPerformanceData();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && data.activation.status === 'active') {
      interval = setInterval(() => {
        generateMockPerformanceData();
        setLastRefresh(new Date());
      }, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, data.activation.status]);

  // Time series data for charts
  const timeSeriesData = useMemo(() => {
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    return days.map((day, index) => {
      const progress = (index + 1) / 7;
      const finalStrategy = data.strategies.find(s => s.id === data.finalStrategy);
      
      return {
        day,
        plannedSpend: (data.budget * progress) / 7,
        actualSpend: (data.overallPerformance.totalSpend * progress) + (Math.random() * 1000 - 500),
        plannedRoas: finalStrategy?.roas || 0,
        actualRoas: (data.overallPerformance.overallRoas * (0.8 + Math.random() * 0.4)),
        impressions: (data.overallPerformance.totalImpressions * progress) + (Math.random() * 10000 - 5000),
        reach: Math.min(100, (data.overallPerformance.totalReach * progress) + (Math.random() * 5 - 2.5))
      };
    });
  }, [data.overallPerformance, data.budget, data.finalStrategy]);

  // Budget reallocation handlers
  const handleBudgetReallocation = (channelId: string, newBudget: number) => {
    const updatedChannels = data.channelPerformance.map(channel => 
      channel.channelId === channelId 
        ? { ...channel, budgetAllocated: newBudget }
        : channel
    );
    onUpdate({ channelPerformance: updatedChannels });
  };

  const pauseChannel = (channelId: string) => {
    const updatedChannels = data.channelPerformance.map(channel => 
      channel.channelId === channelId 
        ? { ...channel, status: 'paused' as const }
        : channel
    );
    onUpdate({ channelPerformance: updatedChannels });
  };

  const resumeChannel = (channelId: string) => {
    const updatedChannels = data.channelPerformance.map(channel => 
      channel.channelId === channelId 
        ? { ...channel, status: 'active' as const }
        : channel
    );
    onUpdate({ channelPerformance: updatedChannels });
  };

  const acknowledgeAlert = (alertId: string) => {
    const updatedAlerts = data.performanceAlerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    onUpdate({ performanceAlerts: updatedAlerts });
  };

  // Generate AI insights based on performance data
  const generateAIInsights = (channels: ChannelPerformance[], alerts: PerformanceAlert[], overallRoas: number): AIPerformanceInsight[] => {
    const insights: AIPerformanceInsight[] = [];
    const timestamp = new Date();

    // Always generate at least one insight for demonstration
    if (data.aiPerformanceInsights.length === 0) {
      // Generate demo insights that emphasize Statista + SynthiePop predictions vs reality
      insights.push({
        id: `insight-demo-statista-${timestamp.getTime()}`,
        type: 'opportunity',
        title: 'SynthiePop vs Reality: Untapped Segment Discovery',
        description: 'SynthiePop identified 340k potential users in your target demographics, but Statista shows only 18% market penetration. Your campaign is reaching just 23% of this opportunity—82% remains untapped.',
        severity: 'medium',
        confidence: 89,
        impact: {
          type: 'performance_gain',
          estimated: 12400,
          timeframe: 'next 14 days'
        },
        recommendations: [
          'Reallocate 30% more budget to underserved SynthiePop segments',
          'Target households with 3+ members (SynthiePop shows 2.3x higher density than current penetration)',
          'Focus on Baden-Württemberg where population density exceeds competitor presence by 45%'
        ],
        dataPoints: [{
          metric: 'Market Penetration Gap',
          current: 18.3,
          expected: 34.7,
          variance: 89.3
        }, {
          metric: 'SynthiePop Opportunity Coverage',
          current: 23,
          expected: 55,
          variance: 139.1
        }],
        generatedAt: timestamp,
        acknowledged: false
      });

      insights.push({
        id: `insight-demo-conversion-${timestamp.getTime()}`,
        type: 'achievement',
        title: 'Conversion Rate vs Statista Benchmarks',
        description: `Your ${data.category || 'category'} campaign is converting at 4.2%, beating Statista's industry average of 2.8% by 50%. SynthiePop demographic precision is driving superior performance in targeted segments.`,
        severity: 'low',
        confidence: 94,
        impact: {
          type: 'performance_gain',
          estimated: 8900,
          timeframe: 'current period'
        },
        recommendations: [
          'Scale successful segments: Males 35-45 in urban areas showing 6.1% conversion',
          'Expand to similar SynthiePop profiles in adjacent Bundesländer',
          'Increase budget allocation to overperforming demographic clusters'
        ],
        dataPoints: [{
          metric: 'Conversion Rate vs Statista Benchmark',
          current: 4.2,
          expected: 2.8,
          variance: 50
        }, {
          metric: 'SynthiePop Segment Performance',
          current: 6.1,
          expected: 4.2,
          variance: 45.2
        }],
        generatedAt: timestamp,
        acknowledged: false
      });

      insights.push({
        id: `insight-demo-geographic-${timestamp.getTime()}`,
        type: 'warning',
        title: 'Geographic Mismatch: Spend vs Population Density',
        description: 'SynthiePop shows highest target population in Bayern (23% of total), but only 14% of your budget is allocated there. Meanwhile, 31% is spent in NRW with just 18% of your audience.',
        severity: 'medium',
        confidence: 91,
        impact: {
          type: 'efficiency_improvement',
          estimated: 6700,
          timeframe: 'next 7 days'
        },
        recommendations: [
          'Shift 12% of budget from NRW to Bayern to match SynthiePop density',
          'Target München and Stuttgart specifically—highest audience concentration per Statista usage data',
          'Reduce spend in oversaturated markets where competition exceeds SynthiePop opportunity'
        ],
        dataPoints: [{
          metric: 'Bayern Budget vs Population Match',
          current: 14,
          expected: 23,
          variance: -39.1
        }, {
          metric: 'NRW Budget Efficiency',  
          current: 31,
          expected: 18,
          variance: 72.2
        }],
        generatedAt: timestamp,
        acknowledged: false
      });
    }

    // Analyze channel performance
    channels.forEach(channel => {
      const roasVariance = ((channel.roasActual - channel.roasPlanned) / channel.roasPlanned) * 100;
      
      if (Math.abs(roasVariance) > 10) { // Lowered threshold to generate more insights
        insights.push({
          id: `insight-${channel.channelId}-${timestamp.getTime()}`,
          type: roasVariance > 0 ? 'opportunity' : 'warning',
          title: `${channel.channelName} ${roasVariance > 0 ? 'Outperforming' : 'Underperforming'} ROAS`,
          description: `${channel.channelName} is ${roasVariance > 0 ? 'exceeding' : 'falling short of'} ROAS expectations by ${Math.abs(roasVariance).toFixed(1)}%`,
          channelId: channel.channelId,
          severity: Math.abs(roasVariance) > 25 ? 'high' : 'medium',
          confidence: 89,
          impact: {
            type: roasVariance > 0 ? 'performance_gain' : 'risk_mitigation',
            estimated: Math.abs(roasVariance * channel.budgetSpent / 100),
            timeframe: 'next 7 days'
          },
          recommendations: roasVariance > 0 ? 
            [`Consider increasing budget allocation for ${channel.channelName}`, 'Monitor for scale efficiency'] :
            [`Review creative performance for ${channel.channelName}`, 'Consider bid optimization', 'Evaluate audience targeting'],
          dataPoints: [{
            metric: 'ROAS',
            current: channel.roasActual,
            expected: channel.roasPlanned,
            variance: roasVariance
          }],
          generatedAt: timestamp,
          acknowledged: false
        });
      }
    });

    // Overall campaign insight
    const finalStrategy = data.strategies.find(s => s.id === data.finalStrategy);
    if (finalStrategy && Math.abs((overallRoas - finalStrategy.roas) / finalStrategy.roas) > 0.05) { // Lowered threshold
      insights.push({
        id: `insight-overall-${timestamp.getTime()}`,
        type: overallRoas > finalStrategy.roas ? 'achievement' : 'warning',
        title: 'Overall Campaign Performance Analysis',
        description: `Campaign is ${overallRoas > finalStrategy.roas ? 'outperforming' : 'underperforming'} predicted ROAS by ${Math.abs(((overallRoas - finalStrategy.roas) / finalStrategy.roas) * 100).toFixed(1)}%`,
        severity: 'medium',
        confidence: 92,
        impact: {
          type: overallRoas > finalStrategy.roas ? 'performance_gain' : 'cost_saving',
          estimated: Math.abs((overallRoas - finalStrategy.roas) * data.overallPerformance.totalSpend),
          timeframe: 'current period'
        },
        recommendations: overallRoas > finalStrategy.roas ?
          ['Consider scaling successful channels', 'Reallocate budget from underperforming channels'] :
          ['Review targeting parameters', 'Optimize creative performance', 'Consider bid adjustments'],
        dataPoints: [{
          metric: 'Overall ROAS',
          current: overallRoas,
          expected: finalStrategy.roas,
          variance: ((overallRoas - finalStrategy.roas) / finalStrategy.roas) * 100
        }],
        generatedAt: timestamp,
        acknowledged: false
      });
    }

    return insights.filter(insight => 
      !data.aiPerformanceInsights.some(existing => 
        existing.id === insight.id
      )
    );
  };

  // Handle AI chat interactions
  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage: PerformanceChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: chatMessage,
      timestamp: new Date()
    };

    const updatedMessages = [...data.performanceChatMessages, userMessage];
    onUpdate({ performanceChatMessages: updatedMessages });
    setChatMessage('');
    setIsAnalyzing(true);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    const aiResponse = generateAIResponse(chatMessage);
    const finalMessages = [...updatedMessages, aiResponse];
    
    onUpdate({ performanceChatMessages: finalMessages });
    setIsAnalyzing(false);
  };

  // Generate AI responses based on user queries with Statista + SynthiePop context
  const generateAIResponse = (query: string): PerformanceChatMessage => {
    const lowerQuery = query.toLowerCase();
    let response = '';
    let actions: PerformanceChatMessage['actions'] = [];

    if (lowerQuery.includes('roas') || lowerQuery.includes('return')) {
      const currentRoas = data.overallPerformance.overallRoas;
      const plannedRoas = data.strategies.find(s => s.id === data.finalStrategy)?.roas || 0;
      const variance = ((currentRoas - plannedRoas) / plannedRoas * 100);
      const statistaBenchmark = 2.8; // Industry benchmark
      
      response = `Your current ROAS is ${currentRoas.toFixed(2)}x, ${variance > 0 ? 'beating' : 'below'} predictions by ${Math.abs(variance).toFixed(1)}%. `;
      
      if (currentRoas > statistaBenchmark) {
        response += `This exceeds Statista's ${data.category || 'category'} benchmark of ${statistaBenchmark}x by ${((currentRoas - statistaBenchmark) / statistaBenchmark * 100).toFixed(1)}%! SynthiePop's precise demographic targeting is driving superior performance. `;
      }
      
      if (variance < -10) {
        response += 'SynthiePop data suggests reallocating to higher-density demographic clusters. Focus on segments with 3+ household size showing 45% better conversion rates.';
        actions = [{
          id: 'optimize_roas',
          label: 'Target High-Density SynthiePop Segments',
          type: 'optimization'
        }];
      } else if (variance > 10) {
        response += 'Your success in targeted SynthiePop segments suggests expanding to similar demographic profiles in adjacent regions.';
        actions = [{
          id: 'scale_performance',
          label: 'Expand to Similar Demographics',
          type: 'budget_reallocation'
        }];
      }
    } else if (lowerQuery.includes('budget') || lowerQuery.includes('spend')) {
      const spentPercentage = (data.overallPerformance.totalSpend / data.budget * 100);
      const daysElapsed = data.flightLength - data.overallPerformance.daysRemaining;
      const expectedSpentPercentage = (daysElapsed / data.flightLength * 100);
      
      response = `You've spent €${(data.overallPerformance.totalSpend / 1000).toFixed(1)}k (${spentPercentage.toFixed(1)}%) of your €${(data.budget / 1000).toFixed(1)}k budget. Based on ${daysElapsed} days elapsed, you're ${spentPercentage > expectedSpentPercentage ? 'ahead' : 'behind'} the expected pacing by ${Math.abs(spentPercentage - expectedSpentPercentage).toFixed(1)}%.`;
      
      if (Math.abs(spentPercentage - expectedSpentPercentage) > 10) {
        actions = [{
          id: 'adjust_pacing',
          label: 'Adjust Budget Pacing',
          type: 'budget_reallocation'
        }];
      }
    } else if (lowerQuery.includes('channel') || lowerQuery.includes('performance')) {
      const bestChannel = data.channelPerformance.reduce((best, current) => 
        current.roasActual > best.roasActual ? current : best
      );
      const worstChannel = data.channelPerformance.reduce((worst, current) => 
        current.roasActual < worst.roasActual ? current : worst
      );
      
      response = `Channel analysis: ${bestChannel.channelName} leads with ${bestChannel.roasActual.toFixed(2)}x ROAS vs ${worstChannel.channelName} at ${worstChannel.roasActual.toFixed(2)}x. SynthiePop data shows ${bestChannel.channelName} reaches 34% more of your target demographic density than ${worstChannel.channelName}. Statista usage patterns confirm ${bestChannel.channelName} aligns better with your ${data.category || 'category'} audience behavior.`;
      
      actions = [{
        id: 'rebalance_channels',
        label: 'Reallocate to Higher-Density Channels',
        type: 'budget_reallocation',
        parameters: {
          fromChannel: worstChannel.channelId,
          toChannel: bestChannel.channelId
        }
      }];
    } else if (lowerQuery.includes('optimize') || lowerQuery.includes('improve')) {
      const underperformingChannels = data.channelPerformance.filter(ch => ch.status === 'underperforming');
      
      if (underperformingChannels.length > 0) {
        response = `I've identified ${underperformingChannels.length} underperforming channel${underperformingChannels.length > 1 ? 's' : ''}: ${underperformingChannels.map(ch => ch.channelName).join(', ')}. Key optimization strategies: 1) Review and refresh creative assets, 2) Tighten audience targeting, 3) Adjust bidding strategies, 4) Consider reallocating budget to top performers.`;
        
        actions = underperformingChannels.map(ch => ({
          id: `pause_${ch.channelId}`,
          label: `Pause ${ch.channelName}`,
          type: 'pause_channel' as const,
          parameters: { channelId: ch.channelId }
        }));
      } else {
        response = 'Your campaign is performing well overall! To further optimize: 1) Scale budget to your best-performing channels, 2) Test new creative variations, 3) Expand to similar high-value audiences, 4) Monitor for any emerging trends in performance data.';
      }
    } else if (lowerQuery.includes('statista') || lowerQuery.includes('benchmark') || lowerQuery.includes('market')) {
      response = `Your campaign performance vs Statista market intelligence: Converting at 4.2% vs industry average of 2.8% (+50%). Your precise SynthiePop targeting is accessing high-value segments that competitors miss. Market penetration shows 67% opportunity still untapped in your defined population clusters.`;
    } else if (lowerQuery.includes('synthiepop') || lowerQuery.includes('population') || lowerQuery.includes('demographic')) {
      response = `SynthiePop analysis reveals: Your campaign reaches 23% of the identified target population (${data.directCohorts.population.toLocaleString()} people). Highest conversion rates in households with 3+ members (6.1% vs 4.2% average). Geographic concentration in Bayern shows 45% higher engagement than predicted.`;
    } else if (lowerQuery.includes('opportunity') || lowerQuery.includes('untapped') || lowerQuery.includes('growth')) {
      response = `Growth opportunities identified: SynthiePop shows 340k potential users in your demographics with only 18% current market penetration per Statista. Focus expansion on: 1) Baden-Württemberg (population density 2.3x higher than current reach), 2) Households 35-45 with children (conversion rate 45% above average), 3) Mid-size cities where competition is 60% below SynthiePop density.`;
    } else {
      response = 'I can analyze your campaign using Statista market intelligence and SynthiePop population data. Ask about: ROAS vs benchmarks, channel performance vs demographic density, untapped opportunities, conversion rates, geographic optimization, or population targeting effectiveness.';
    }

    return {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: response,
      timestamp: new Date(),
      actions: actions.length > 0 ? actions : undefined,
      data: {
        confidence: 85,
        impact: 'medium'
      }
    };
  };

  const executeAIAction = (action: NonNullable<PerformanceChatMessage['actions']>[0]) => {
    if (!action) return;

    switch (action.type) {
      case 'pause_channel':
        if (action.parameters?.channelId) {
          pauseChannel(action.parameters.channelId);
        }
        break;
      case 'budget_reallocation':
        // Implement auto budget reallocation logic
        break;
      // Add more action handlers as needed
    }
  };

  const acknowledgeInsight = (insightId: string) => {
    const updatedInsights = data.aiPerformanceInsights.map(insight =>
      insight.id === insightId ? { ...insight, acknowledged: true } : insight
    );
    onUpdate({ aiPerformanceInsights: updatedInsights });
  };

  const getStatusColor = (status: ChannelPerformance['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'overperforming': return 'bg-blue-100 text-blue-800';
      case 'underperforming': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceIcon = (planned: number, actual: number) => {
    const variance = ((actual - planned) / planned) * 100;
    if (variance > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variance < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <CheckCircle className="h-4 w-4 text-gray-600" />;
  };

  const unacknowledgedAlerts = data.performanceAlerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');

  if (data.activation.status === 'draft') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2>Performance Monitoring Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Campaign must be activated to begin performance monitoring.
          </p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3>No Active Campaign</h3>
                <p className="text-muted-foreground">
                  Please activate your campaign in the previous step to begin monitoring performance.
                </p>
              </div>
              <Button onClick={onPrev} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Go to Campaign Activation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2>Performance Monitoring Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Real-time campaign performance tracking and optimization controls.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <span className="text-sm">Auto-refresh</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                generateMockPerformanceData();
                setLastRefresh(new Date());
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force regenerate AI insights by clearing them first
                onUpdate({ aiPerformanceInsights: [] });
                setTimeout(() => generateMockPerformanceData(), 100);
                setLastRefresh(new Date());
              }}
            >
              <Brain className="h-4 w-4 mr-2" />
              Refresh AI
            </Button>
            <div className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-red-800">
                  {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''} require attention
                </span>
                <Button variant="outline" size="sm" className="ml-4">
                  View Alerts
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{(data.overallPerformance.totalSpend / 1000).toFixed(1)}k
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  {data.overallPerformance.campaignProgress.toFixed(1)}% of budget
                </span>
                {getVarianceIcon(data.budget, data.overallPerformance.totalSpend)}
              </div>
              <Progress 
                value={data.overallPerformance.campaignProgress} 
                className="mt-2 h-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.overallPerformance.overallRoas.toFixed(1)}x
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  vs {data.strategies.find(s => s.id === data.finalStrategy)?.roas.toFixed(1)}x planned
                </span>
                {getVarianceIcon(
                  data.strategies.find(s => s.id === data.finalStrategy)?.roas || 0,
                  data.overallPerformance.overallRoas
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.overallPerformance.totalReach.toFixed(1)}%
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  {(data.overallPerformance.totalReach * data.directCohorts.population / 100).toFixed(0)} people
                </span>
                {getVarianceIcon(
                  data.strategies.find(s => s.id === data.finalStrategy)?.reach || 0,
                  data.overallPerformance.totalReach
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.overallPerformance.daysRemaining}
              </div>
              <div className="text-xs text-muted-foreground">
                of {data.flightLength} day campaign
              </div>
              <Progress 
                value={((data.flightLength - data.overallPerformance.daysRemaining) / data.flightLength) * 100} 
                className="mt-2 h-2" 
              />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Performance Overview</TabsTrigger>
            <TabsTrigger value="channels">Channel Breakdown</TabsTrigger>
            <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
            <TabsTrigger value="optimize">Budget Optimization</TabsTrigger>
            <TabsTrigger value="ai-chat">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>AI Analysis & Chat</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="alerts">Alerts & Actions</TabsTrigger>
          </TabsList>

          {/* Performance Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statista + SynthiePop vs Reality Analysis */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-blue-800">Statista</span>
                  </div>
                  <span className="text-gray-500">+</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-green-800">SynthiePop</span>
                  </div>
                  <span className="text-gray-700">vs Reality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Market Penetration</div>
                      <div className="text-2xl font-semibold text-blue-600">18.3%</div>
                      <div className="text-xs text-muted-foreground">Statista Benchmark: 12.8%</div>
                      <div className="text-xs text-green-600">+43% vs Industry</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Population Coverage</div>
                      <div className="text-2xl font-semibold text-green-600">23%</div>
                      <div className="text-xs text-muted-foreground">SynthiePop Target: {data.directCohorts.population.toLocaleString()}</div>
                      <div className="text-xs text-amber-600">77% Opportunity Remaining</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Conversion Efficiency</div>
                      <div className="text-2xl font-semibold text-emerald-600">4.2%</div>
                      <div className="text-xs text-muted-foreground">Statista Average: 2.8%</div>
                      <div className="text-xs text-emerald-600">+50% vs Category</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/70 rounded-lg">
                  <div className="text-sm">
                    <strong>AI Insight:</strong> Your SynthiePop-targeted segments are outperforming Statista benchmarks by 43%. 
                    The combination of demographic precision (SynthiePop) and behavioral insights (Statista) is driving superior 
                    efficiency. Expand to similar population clusters for maximum growth potential.
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spend Pacing vs Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <RechartsTooltip formatter={(value: any) => [`€${(Number(value)/1000).toFixed(1)}k`, '']} />
                      <Area 
                        type="monotone" 
                        dataKey="plannedSpend" 
                        fill="#e2e8f0" 
                        stroke="#64748b"
                        name="Planned Spend"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actualSpend" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Actual Spend"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ROAS Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <RechartsTooltip formatter={(value: any) => [`${Number(value).toFixed(2)}x`, '']} />
                      <Line 
                        type="monotone" 
                        dataKey="plannedRoas" 
                        stroke="#64748b" 
                        strokeDasharray="5 5"
                        name="Planned ROAS"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actualRoas" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        name="Actual ROAS"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Impressions & Reach Delivery</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Bar yAxisId="left" dataKey="impressions" fill="#3b82f6" name="Impressions" />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="reach" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        name="Reach %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Channel Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.channelPerformance.length > 0 ? data.channelPerformance.map(ch => ({
                          name: ch.channelName,
                          value: ch.budgetSpent,
                          roas: ch.roasActual
                        })) : [
                          { name: 'Google Ads', value: 15000, roas: 3.2 },
                          { name: 'Facebook Ads', value: 12000, roas: 2.8 },
                          { name: 'Amazon DSP', value: 8000, roas: 3.5 },
                          { name: 'Youtube Ads', value: 5000, roas: 2.1 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(data.channelPerformance.length > 0 ? data.channelPerformance : [
                          { name: 'Google Ads', value: 15000, roas: 3.2 },
                          { name: 'Facebook Ads', value: 12000, roas: 2.8 },
                          { name: 'Amazon DSP', value: 8000, roas: 3.5 },
                          { name: 'Youtube Ads', value: 5000, roas: 2.1 }
                        ]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 90}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => [`€${(Number(value)/1000).toFixed(1)}k`, 'Spend']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Channel Breakdown Tab */}
          <TabsContent value="channels" className="space-y-6">
            <div className="space-y-4">
              {data.channelPerformance.map(channel => (
                <Card key={channel.channelId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle>{channel.channelName}</CardTitle>
                        <Badge className={getStatusColor(channel.status)}>
                          {channel.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {channel.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pauseChannel(channel.channelId)}
                          >
                            <PauseCircle className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : channel.status === 'paused' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resumeChannel(channel.channelId)}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground">Budget Utilization</div>
                        <div className="text-xl font-medium">
                          €{(channel.budgetSpent / 1000).toFixed(1)}k
                        </div>
                        <div className="text-xs text-muted-foreground">
                          of €{(channel.budgetAllocated / 1000).toFixed(1)}k allocated
                        </div>
                        <Progress 
                          value={(channel.budgetSpent / channel.budgetAllocated) * 100} 
                          className="mt-2 h-2" 
                        />
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">ROAS</div>
                        <div className="text-xl font-medium flex items-center space-x-2">
                          <span>{channel.roasActual.toFixed(2)}x</span>
                          {getVarianceIcon(channel.roasPlanned, channel.roasActual)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          vs {channel.roasPlanned.toFixed(2)}x planned
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Impressions</div>
                        <div className="text-xl font-medium">
                          {(channel.impressionsActual / 1000).toFixed(0)}k
                        </div>
                        <div className="text-xs text-muted-foreground">
                          vs {(channel.impressionsPlanned / 1000).toFixed(0)}k planned
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">CPM</div>
                        <div className="text-xl font-medium flex items-center space-x-2">
                          <span>€{channel.cpmActual.toFixed(2)}</span>
                          {getVarianceIcon(channel.cpmPlanned, channel.cpmActual)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          vs €{channel.cpmPlanned.toFixed(2)} planned
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">External Campaign ID</div>
                      <div className="text-xs font-mono bg-muted p-2 rounded">
                        {channel.campaignId}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Variance Analysis Tab */}
          <TabsContent value="variance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance vs Prediction Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        +{(((data.overallPerformance.overallRoas) / (data.strategies.find(s => s.id === data.finalStrategy)?.roas || 1) - 1) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">ROAS vs Prediction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {((data.overallPerformance.totalReach) / (data.strategies.find(s => s.id === data.finalStrategy)?.reach || 1) * 100 - 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Reach vs Prediction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {((data.overallPerformance.totalSpend / data.budget) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Budget Utilization</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-3">Key Variance Drivers</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-green-800">Lower CPM than expected</div>
                          <div className="text-sm text-green-600">Average CPM 15% below forecast</div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">+0.8x ROAS</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-medium text-blue-800">Higher engagement rates</div>
                          <div className="text-sm text-blue-600">Click-through rates 22% above benchmark</div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">+0.5x ROAS</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <div className="font-medium text-yellow-800">Platform algorithm changes</div>
                          <div className="text-sm text-yellow-600">Reach optimization slightly below forecast</div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">-2% Reach</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Optimization Tab */}
          <TabsContent value="optimize" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Budget Reallocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      Reallocate budget between channels based on performance. Changes take effect within 24 hours.
                    </AlertDescription>
                  </Alert>

                  {data.channelPerformance.map(channel => (
                    <div key={channel.channelId} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{channel.channelName}</div>
                          <div className="text-sm text-muted-foreground">
                            Current: €{(channel.budgetAllocated / 1000).toFixed(1)}k • 
                            ROAS: {channel.roasActual.toFixed(2)}x • 
                            Status: {channel.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-medium">
                            €{(channel.budgetAllocated / 1000).toFixed(1)}k
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Slider
                          value={[channel.budgetAllocated]}
                          onValueChange={([value]) => handleBudgetReallocation(channel.channelId, value)}
                          min={0}
                          max={data.budget * 0.8} // Max 80% to one channel
                          step={1000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>€0</span>
                          <span>€{(data.budget * 0.8 / 1000).toFixed(0)}k max</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Efficiency Score:</span>
                          <span className="ml-1 font-medium">
                            {(channel.roasActual * (channel.impressionsActual / 10000)).toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Projected ROAS:</span>
                          <span className="ml-1 font-medium">
                            {(channel.roasActual * 1.05).toFixed(2)}x
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Risk Level:</span>
                          <span className="ml-1 font-medium">
                            {channel.status === 'overperforming' ? 'Low' : 
                             channel.status === 'underperforming' ? 'High' : 'Medium'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Allocated:</span>
                      <span className="text-lg font-bold">
                        €{(data.channelPerformance.reduce((sum, ch) => sum + ch.budgetAllocated, 0) / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of €{(data.budget / 1000).toFixed(1)}k total budget
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Performance Alerts</h4>
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {unacknowledgedAlerts.length} unread
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {data.performanceAlerts.map(alert => (
                <Card key={alert.id} className={`${
                  alert.acknowledged ? 'opacity-50' : ''
                } ${
                  alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                          {alert.channelId && (
                            <Badge variant="outline">
                              {data.channelPerformance.find(ch => ch.channelId === alert.channelId)?.channelName}
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-sm text-muted-foreground">
                          {alert.timestamp.toLocaleString()}
                        </div>
                      </div>
                      
                      {!alert.acknowledged && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {data.performanceAlerts.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                      <div className="font-medium">All systems normal</div>
                      <div className="text-sm text-muted-foreground">
                        No performance alerts at this time
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          {/* AI Analysis & Chat Tab */}
          <TabsContent value="ai-chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Insights Panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <span>AI Performance Insights</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={showAIInsights}
                        onCheckedChange={setShowAIInsights}
                      />
                      <span className="text-sm">Show Insights</span>
                    </div>  
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] space-y-4">
                    {data.aiPerformanceInsights.filter(insight => !insight.acknowledged).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Loading AI insights...</p>
                        <p className="text-sm mt-2">AI is analyzing your campaign performance data.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => generateMockPerformanceData()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Generate Insights
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {data.aiPerformanceInsights
                          .filter(insight => !insight.acknowledged)
                          .map((insight) => (
                          <Card key={insight.id} className={`border-l-4 ${
                            insight.type === 'opportunity' ? 'border-l-green-500 bg-green-50/50' :
                            insight.type === 'warning' ? 'border-l-red-500 bg-red-50/50' :
                            insight.type === 'achievement' ? 'border-l-blue-500 bg-blue-50/50' :
                            insight.type === 'anomaly' ? 'border-l-orange-500 bg-orange-50/50' :
                            'border-l-gray-500 bg-gray-50/50'
                          }`}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      {insight.type === 'opportunity' ? <TrendingUpIcon className="h-4 w-4 text-green-600" /> :
                                       insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
                                       insight.type === 'achievement' ? <CheckCircle className="h-4 w-4 text-blue-600" /> :
                                       insight.type === 'anomaly' ? <Zap className="h-4 w-4 text-orange-600" /> :
                                       <Lightbulb className="h-4 w-4 text-gray-600" />}
                                      <h4 className="font-medium">{insight.title}</h4>
                                      <Badge className={`text-xs ${
                                        insight.severity === 'high' || insight.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {insight.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {insight.description}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => acknowledgeInsight(insight.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Impact:</span>
                                    <span className="ml-1 font-medium">
                                      €{(insight.impact.estimated / 1000).toFixed(1)}k {insight.impact.timeframe}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Confidence:</span>
                                    <span className="ml-1 font-medium">{insight.confidence}%</span>
                                  </div>
                                </div>

                                {insight.recommendations.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                                    <ul className="text-sm space-y-1">
                                      {insight.recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-start space-x-2">
                                          <span className="text-muted-foreground">•</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* AI Chat Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <span>AI Performance Assistant</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ScrollArea className="h-[400px] w-full border rounded-lg p-4">
                      <div className="space-y-4">
                        {data.performanceChatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.type === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.type !== 'user' && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.type === 'system' ? 'bg-blue-100' : 
                                message.type === 'insight' ? 'bg-purple-100' :
                                'bg-green-100'
                              }`}>
                                {message.type === 'system' ? (
                                  <Sparkles className="h-4 w-4 text-blue-600" />
                                ) : message.type === 'insight' ? (
                                  <Lightbulb className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <Bot className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            )}
                            
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.type === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : message.type === 'system'
                                  ? 'bg-blue-50 text-blue-900'
                                  : message.type === 'insight'
                                  ? 'bg-purple-50 text-purple-900'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                              
                              {message.actions && message.actions.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {message.actions.map((action, index) => (
                                    <Button
                                      key={index}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => executeAIAction(action)}
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      {action.label}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              
                              {message.data && (
                                <div className="flex items-center space-x-2 mt-2 text-xs opacity-75">
                                  <span>Confidence: {message.data.confidence}%</span>
                                  <Badge variant="outline" className="text-xs">
                                    {message.data.impact} impact
                                  </Badge>
                                </div>
                              )}
                              
                              <div className="text-xs mt-1 opacity-50">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>

                            {message.type === 'user' && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {isAnalyzing && (
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="bg-muted px-4 py-2 rounded-lg">
                              <div className="text-sm">Analyzing performance data...</div>
                              <div className="flex space-x-1 mt-2">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Ask about performance, request analysis, or get optimization suggestions..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        className="flex-1 min-h-[60px]"
                        rows={2}
                      />
                      <Button 
                        onClick={handleSendChatMessage} 
                        disabled={!chatMessage.trim() || isAnalyzing}
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatMessage('How does my ROAS compare to Statista benchmarks?')}
                        disabled={isAnalyzing}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        ROAS vs Benchmarks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatMessage('Show SynthiePop population coverage and opportunities')}
                        disabled={isAnalyzing}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Population Analysis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatMessage('What untapped opportunities does the data show?')}
                        disabled={isAnalyzing}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        Find Opportunities
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatMessage('Compare my performance to Statista market intelligence')}
                        disabled={isAnalyzing}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Market Comparison
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChatMessage('Where should I reallocate budget based on SynthiePop density?')}
                        disabled={isAnalyzing}
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Geographic Optimization
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Performance Report
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}