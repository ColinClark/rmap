import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Send, 
  Users, 
  Download, 
  RefreshCw, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Database,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  BarChart3,
  Filter,
  Target,
  Building2,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { CampaignData } from '../workflows/RetailMediaWorkflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CohortBuilderProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'insight' | 'tool';
  content: string;
  timestamp: Date;
  isExploration?: boolean;
  isFinalResult?: boolean;
  phase?: 'exploring' | 'analyzing' | 'finalizing';
  toolName?: string;
  toolResult?: any;
  isToolUse?: boolean; // True when showing tool is being called, false/undefined when showing result
  toolResults?: Array<{
    tool: string;
    resultSummary: string;
  }>;
  data?: {
    cohortSize?: number;
    query?: string;
    traits?: Array<{ trait: string; percentage: number }>;
    recommendation?: string;
    confidence?: number;
  };
  actions?: Array<{
    id: string;
    label: string;
    type: 'save' | 'export' | 'refine' | 'expand';
  }>;
}

interface CohortSummary {
  size: number;
  percentageOfTotal: number;
  topTraits: Array<{ trait: string; percentage: number }>;
  sqlQuery: string;
  confidence: number;
}

export function CohortBuilder({ data, onUpdate, onNext, onPrev }: CohortBuilderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Cohort Builder assistant. I can help you explore and build audience segments for your retail media campaigns. Try asking me things like:\n\n• \"Show me women aged 25-34 in Berlin with income > €50,000\"\n• \"Find parents with two children who buy organic food\"\n• \"Which demographics shop at Aldi weekly?\"\n• \"Build a cohort of 500,000 people likely to buy premium skincare\"",
      timestamp: new Date(),
      data: {
        recommendation: 'Start with a demographic query or describe your ideal customer'
      }
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCohort, setCurrentCohort] = useState<CohortSummary | null>({
    size: 2450000,
    percentageOfTotal: 2.95,
    topTraits: [
      { trait: 'Age 25-34', percentage: 45 },
      { trait: 'Urban dwellers', percentage: 78 },
      { trait: 'Tech-savvy', percentage: 82 }
    ],
    sqlQuery: `SELECT * FROM synthiepop_germany 
WHERE age BETWEEN 25 AND 34 
AND location = 'urban' 
AND tech_affinity > 0.8`,
    confidence: 85
  });
  const [savedCohorts, setSavedCohorts] = useState<CohortSummary[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  // const messagesEndRef = useRef<HTMLDivElement>(null); // Removed auto-scrolling
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Removed auto-scrolling - let users control their own scroll position
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get authentication and tenant context
      const accessToken = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');
      const sessionId = sessionStorage.getItem('sessionId');

      // Send to real API with streaming (using relative path - Vite proxy forwards to backend)
      const response = await fetch('/api/cohort/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          query: input
        })
      });

      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let currentMessageId: string | null = null;
      let buffer = ''; // Buffer for incomplete lines

      console.log('Starting to read SSE stream...');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream reading complete');
            break;
          }

          const chunk = decoder.decode(value);
          console.log('Received chunk:', chunk);
          
          // Add chunk to buffer
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue; // Skip empty lines
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                console.log('Parsed SSE data:', parsed);

                if (parsed.type === 'content_delta' || parsed.type === 'content') {
                  // Each content chunk creates or updates a message
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];

                    // Check if we should append to last assistant message or create new one
                    // Create new message if: no currentMessageId, or last message is not assistant, or IDs don't match
                    if (currentMessageId && lastMessage && lastMessage.type === 'assistant' && lastMessage.id === currentMessageId) {
                      // Append to existing message
                      // Limit trailing newlines to max 1 during streaming to prevent visual breaks
                      // This prevents "## Heading\n\n\n\n" from showing large gaps before next content arrives
                      const combinedContent = lastMessage.content + parsed.content;
                      lastMessage.content = combinedContent.replace(/\n{2,}$/, '\n');
                      // Update metadata - latest values override
                      if (parsed.isExploration !== undefined) {
                        lastMessage.isExploration = parsed.isExploration;
                      }
                      if (parsed.isFinalResult !== undefined) {
                        lastMessage.isFinalResult = parsed.isFinalResult;
                      }
                      if (parsed.phase) {
                        lastMessage.phase = parsed.phase;
                      }
                    } else {
                      // Create new message
                      const newMessage: ChatMessage = {
                        id: Date.now().toString() + '-' + Math.random(),
                        type: 'assistant',
                        content: parsed.content,
                        timestamp: new Date(),
                        isExploration: parsed.isExploration,
                        isFinalResult: parsed.isFinalResult,
                        phase: parsed.phase
                      };
                      currentMessageId = newMessage.id;
                      newMessages.push(newMessage);
                    }
                    return newMessages;
                  });
                } else if (parsed.type === 'tool_use') {
                  // Show when a tool is being called
                  const toolLabels: Record<string, string> = {
                    'web_search': '🔍 Searching the web',
                    'catalog': '📊 Checking database schema',
                    'sql': '💾 Querying database',
                    'memory': '🧠 Accessing memory'
                  };

                  const toolUseMessage: ChatMessage = {
                    id: `tool-use-${parsed.toolId}`,
                    type: 'tool',
                    content: toolLabels[parsed.tool] || `Using ${parsed.tool}...`,
                    timestamp: new Date(),
                    toolName: parsed.tool,
                    isToolUse: true
                  };

                  setMessages(prev => [...prev, toolUseMessage]);
                } else if (parsed.type === 'tool_result') {
                  // Don't reset currentMessageId - let content continue appending to the same message
                  // This prevents splitting the final response into multiple messages

                  // Update the tool_use message with the result
                  setMessages(prev => {
                    // Find the corresponding tool_use message and update it
                    const updated = [...prev];
                    const toolUseIndex = updated.findIndex(m =>
                      m.type === 'tool' && m.toolName === parsed.tool && m.isToolUse
                    );

                    if (toolUseIndex !== -1) {
                      // Update the existing tool_use message with the result
                      updated[toolUseIndex] = {
                        ...updated[toolUseIndex],
                        content: parsed.resultSummary || `Tool: ${parsed.tool}`,
                        toolResult: parsed.result,
                        isToolUse: false
                      };
                      return updated;
                    } else {
                      // If no tool_use message found, add a new tool result message
                      const toolMessage: ChatMessage = {
                        id: `tool-${Date.now()}-${Math.random()}`,
                        type: 'tool',
                        content: parsed.resultSummary || `Tool: ${parsed.tool}`,
                        timestamp: new Date(),
                        toolName: parsed.tool,
                        toolResult: parsed.result
                      };
                      return [...prev, toolMessage];
                    }
                  });
                  
                  // Handle cohort data if present
                  if (parsed.result && parsed.result.data) {
                    const data = parsed.result.data;
                    if (Array.isArray(data) && data.length > 0) {
                      const cohortSize = data[0].count || data.length;
                      
                      setCurrentCohort({
                        size: cohortSize,
                        percentageOfTotal: (cohortSize / 83000000) * 100,
                        topTraits: [],
                        sqlQuery: parsed.result.sql || '',
                        confidence: 90
                      });
                    }
                  }
                } else if (parsed.type === 'final_response') {
                  // Analysis complete - just log metadata, don't reset currentMessageId
                  // Keep currentMessageId so subsequent content_delta events append to the same message
                  console.log('Analysis complete:', {
                    iteration: parsed.iteration,
                    textBlocks: parsed.textBlockCount
                  });
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.error);
                } else if (parsed.type === 'end') {
                  // Reset for next interaction
                  currentMessageId = null;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } else {
        console.error('No reader available from response body');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'The AI service is not configured. Please check your API key.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Could not connect to the server. Please ensure the backend is running.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: errorMessage,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (query: string): ChatMessage => {
    // Simulate different types of queries based on PRD use cases
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('women') && lowerQuery.includes('berlin')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I found 342,156 women aged 25-34 in Berlin with income > €50,000. This represents 0.41% of Germany's population.\n\nTop characteristics:\n• 68% have university education\n• 52% work in professional services\n• 43% are single-person households\n• 31% shop organic regularly\n• Average household size: 1.8",
        timestamp: new Date(),
        data: {
          cohortSize: 342156,
          query: "SELECT COUNT(*) FROM synthie WHERE gender = 'female' AND age BETWEEN 25 AND 34 AND state_label = 'Berlin' AND income > 50000",
          traits: [
            { trait: 'University educated', percentage: 68 },
            { trait: 'Professional services', percentage: 52 },
            { trait: 'Single households', percentage: 43 },
            { trait: 'Organic shoppers', percentage: 31 }
          ],
          confidence: 92
        },
        actions: [
          { id: '1', label: 'Save Cohort', type: 'save' },
          { id: '2', label: 'Export SQL', type: 'export' },
          { id: '3', label: 'Refine Further', type: 'refine' }
        ]
      };
    }
    
    if (lowerQuery.includes('parents') && lowerQuery.includes('organic')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I identified 1,234,567 parents with two children who are innovation-friendly and buy organic food. This is 1.49% of the German population.\n\nKey insights:\n• 72% are aged 35-45\n• 81% live in suburban areas\n• 64% have dual income\n• 58% prefer sustainable brands\n• Average monthly grocery spend: €650",
        timestamp: new Date(),
        data: {
          cohortSize: 1234567,
          query: "SELECT COUNT(*) FROM synthie WHERE household_children = 2 AND shopping_preference = 'organic' AND innovation_score > 7",
          traits: [
            { trait: 'Age 35-45', percentage: 72 },
            { trait: 'Suburban', percentage: 81 },
            { trait: 'Dual income', percentage: 64 },
            { trait: 'Sustainable preference', percentage: 58 }
          ],
          confidence: 88
        },
        actions: [
          { id: '1', label: 'Save Cohort', type: 'save' },
          { id: '2', label: 'Find Similar', type: 'expand' }
        ]
      };
    }
    
    if (lowerQuery.includes('aldi') && lowerQuery.includes('weekly')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Men aged 40-45 who shop at Aldi weekly: 456,789 individuals (0.55% of population).\n\nSimilar demographics with high overlap:\n• Men 35-39, same shopping pattern (+312,456 people)\n• Women 40-45, budget-conscious (+523,789 people)\n• Families with 2+ children, suburban (+867,234 people)\n\nRecommended expansion would reach 2,160,268 total individuals.",
        timestamp: new Date(),
        data: {
          cohortSize: 456789,
          query: "SELECT COUNT(*) FROM synthie WHERE gender = 'male' AND age BETWEEN 40 AND 45 AND shopping_location = 'Aldi' AND shopping_frequency = 'weekly'",
          traits: [
            { trait: 'Budget-conscious', percentage: 89 },
            { trait: 'Family-oriented', percentage: 67 },
            { trait: 'Suburban', percentage: 71 },
            { trait: 'Car owners', percentage: 84 }
          ],
          confidence: 90
        },
        actions: [
          { id: '1', label: 'Apply Expansion', type: 'expand' },
          { id: '2', label: 'Save Original', type: 'save' }
        ]
      };
    }
    
    if (lowerQuery.includes('premium skincare') || lowerQuery.includes('500,000')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Generated cohort of 502,341 people likely to buy premium skincare products.\n\nCohort composition:\n• 67% female, 33% male\n• Age: 28-55 (peak at 35-42)\n• Income: €45,000+ (median €62,000)\n• 78% urban/suburban\n• High affinity with beauty, wellness, and health categories\n\nEstimated campaign reach: 35-40% with proper channel mix",
        timestamp: new Date(),
        data: {
          cohortSize: 502341,
          query: "SELECT COUNT(*) FROM synthie WHERE (category_affinity_beauty > 7 OR category_affinity_wellness > 8) AND income > 45000 AND age BETWEEN 28 AND 55",
          traits: [
            { trait: 'Female dominant', percentage: 67 },
            { trait: 'Urban/Suburban', percentage: 78 },
            { trait: 'High income', percentage: 62 },
            { trait: 'Beauty affinity', percentage: 85 }
          ],
          confidence: 86
        },
        actions: [
          { id: '1', label: 'Activate Campaign', type: 'save' },
          { id: '2', label: 'Simulate ROAS', type: 'refine' }
        ]
      };
    }
    
    // Default response for other queries
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: "I'll help you explore that audience segment. Let me query the synthetic population database...\n\nPlease be more specific about the demographics, psychographics, or behaviors you're interested in.",
      timestamp: new Date(),
      data: {
        recommendation: 'Try adding age ranges, income levels, locations, or shopping behaviors'
      }
    };
  };

  const handleAction = (action: { type: string; id: string }) => {
    switch (action.type) {
      case 'save':
        if (currentCohort) {
          setSavedCohorts(prev => [...prev, currentCohort]);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'system',
            content: '✓ Cohort saved successfully',
            timestamp: new Date()
          }]);
        }
        break;
      case 'export':
        if (currentCohort?.sqlQuery) {
          navigator.clipboard.writeText(currentCohort.sqlQuery);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'system',
            content: '✓ SQL query copied to clipboard',
            timestamp: new Date()
          }]);
        }
        break;
      case 'refine':
        inputRef.current?.focus();
        setInput('Refine this cohort by ');
        break;
      case 'expand':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          content: '🔄 Expanding cohort with similar audiences...',
          timestamp: new Date()
        }]);
        break;
    }
  };

  const suggestedQueries = [
    "Urban millennials interested in sustainable products",
    "High-income families with children under 10",
    "Tech-savvy professionals who shop online weekly",
    "Health-conscious consumers who buy organic"
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2>AI-Powered Cohort Builder</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chat Interface - Main Column */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="h-[650px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">AI Cohort Assistant</CardTitle>
                </div>
                {isLoading && (
                  <Badge variant="secondary" className="animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Thinking...
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 py-4">
                  {messages.map((message) => {
                    // Tool results - collapsible and subtle
                    if (message.type === 'tool') {
                      const isExpanded = expandedTools.has(message.id);
                      return (
                        <div
                          key={message.id}
                          className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                          <div className="max-w-[85%] bg-muted/30 rounded-lg p-2 border border-muted">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedTools);
                                if (isExpanded) {
                                  newExpanded.delete(message.id);
                                } else {
                                  newExpanded.add(message.id);
                                }
                                setExpandedTools(newExpanded);
                              }}
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                            >
                              <Wrench className="h-3 w-3" />
                              <span>{message.content}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 ml-auto" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-auto" />
                              )}
                            </button>
                            {isExpanded && message.toolResult && (
                              <div className="mt-2 text-xs font-mono bg-background/50 rounded p-2 overflow-x-auto max-h-48">
                                <pre>{JSON.stringify(message.toolResult, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Exploration messages - subtle and de-emphasized
                    if (message.isExploration && !message.isFinalResult) {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                          <div
                            className="max-w-[85%] break-words bg-muted/40 rounded-lg p-3 border border-muted/50"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap opacity-80
                                        prose-headings:text-muted-foreground prose-headings:font-medium prose-headings:italic
                                        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                                        prose-p:text-muted-foreground prose-p:italic prose-p:leading-normal
                                        prose-ul:my-2 prose-ol:my-2
                                        prose-li:text-muted-foreground prose-li:italic prose-li:my-0.5
                                        prose-strong:text-muted-foreground prose-strong:italic
                                        prose-code:text-muted-foreground prose-code:bg-muted/50 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:break-words
                                        prose-pre:bg-muted/50 prose-pre:text-muted-foreground prose-pre:p-2 prose-pre:text-xs prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Final results - prominently displayed
                    if (message.isFinalResult) {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                          <div
                            className="max-w-[85%] break-words bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20 shadow-sm"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                              <span className="text-xs font-medium text-primary">Analysis Complete</span>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap
                                        prose-headings:text-foreground prose-headings:font-semibold
                                        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-2
                                        prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                                        prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-3
                                        prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-3
                                        prose-ul:my-3 prose-ol:my-3
                                        prose-li:text-foreground prose-li:marker:text-primary prose-li:my-1
                                        prose-strong:text-foreground prose-strong:font-semibold
                                        prose-em:text-foreground prose-em:italic
                                        prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:break-words
                                        prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-3 prose-pre:whitespace-pre-wrap prose-pre:break-words
                                        prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-3
                                        prose-table:my-3 prose-table:border-collapse prose-table:w-full prose-table:table-auto
                                        prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:break-words
                                        prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:break-words
                                        prose-hr:border-border prose-hr:my-4">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                            
                            {message.data?.cohortSize && (
                              <div className="mt-3 pt-3 border-t border-primary/10">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center text-foreground">
                                    <Users className="h-3 w-3 mr-1" />
                                    {message.data.cohortSize.toLocaleString()} people
                                  </span>
                                  <span className="flex items-center text-foreground">
                                    <BarChart3 className="h-3 w-3 mr-1" />
                                    {message.data.confidence}% confidence
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {message.actions && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {message.actions.map((action) => (
                                  <Button
                                    key={action.id}
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs"
                                    onClick={() => handleAction(action)}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Regular messages (user and standard assistant)
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] break-words overflow-wrap-anywhere rounded-lg p-3",
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.type === 'system'
                              ? 'bg-muted text-muted-foreground italic'
                              : 'bg-muted'
                          )}
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        >
                          <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap",
                            message.type === 'user' ? 
                              "prose-invert" :
                              `prose-headings:text-foreground prose-headings:font-medium
                               prose-h1:text-xl prose-h1:mb-3 prose-h1:mt-1
                               prose-h2:text-lg prose-h2:mb-2 prose-h2:mt-3
                               prose-h3:text-base prose-h3:mb-1 prose-h3:mt-2
                               prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-2
                               prose-ul:my-2 prose-ol:my-2
                               prose-li:text-foreground prose-li:my-1
                               prose-strong:text-foreground prose-strong:font-semibold
                               prose-code:text-primary prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:break-words
                               prose-pre:bg-background prose-pre:text-foreground prose-pre:p-2 prose-pre:rounded prose-pre:my-2 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-x-auto
                               prose-blockquote:border-l-2 prose-blockquote:border-l-muted-foreground prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
                               prose-table:border-collapse prose-table:table-auto prose-th:border prose-th:border-border prose-th:break-words prose-td:border prose-td:border-border prose-td:break-words`
                          )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          </div>
                          
                          {message.data?.cohortSize && (
                            <div className="mt-3 pt-3 border-t border-border/20">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {message.data.cohortSize.toLocaleString()} people
                                </span>
                                <span className="flex items-center">
                                  <BarChart3 className="h-3 w-3 mr-1" />
                                  {message.data.confidence}% confidence
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {message.actions && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {message.actions.map((action) => (
                                <Button
                                  key={action.id}
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs"
                                  onClick={() => handleAction(action)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Loading indicator with phase-aware messaging */}
                  {isLoading && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="max-w-[85%] bg-muted/60 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {(() => {
                              const lastMessage = messages[messages.length - 1];
                              if (lastMessage?.phase === 'finalizing') {
                                return 'Finalizing your cohort analysis...';
                              } else if (lastMessage?.phase === 'analyzing') {
                                return 'Analyzing demographics and behaviors...';
                              } else {
                                return 'Exploring your cohort requirements...';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* <div ref={messagesEndRef} /> Removed auto-scrolling */}
                </div>
              </ScrollArea>
              
              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex space-x-2 items-end">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Describe your target audience..."
                    disabled={isLoading}
                    className="flex-1 min-h-[40px] max-h-[200px] resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="mb-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Suggested Queries */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedQueries.map((query, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setInput(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Current Cohort Summary */}
          {currentCohort && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Current Cohort
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Size</span>
                  <span className="font-semibold">
                    {currentCohort.size.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">% of Total</span>
                  <span className="font-semibold">
                    {currentCohort.percentageOfTotal.toFixed(2)}%
                  </span>
                </div>
                <Progress value={currentCohort.confidence} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {currentCohort.confidence}% confidence score
                </p>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium mb-2">Top Traits</p>
                  <div className="space-y-2">
                    {currentCohort.topTraits.map((trait, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{trait.trait}</span>
                        <Badge variant="secondary">{trait.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-3 space-y-2">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleAction({ type: 'save', id: '1' })}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Save Cohort
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Saved Cohorts */}
          {savedCohorts && savedCohorts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Saved Cohorts ({savedCohorts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {savedCohorts.map((cohort, i) => (
                      <div key={i} className="p-2 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Cohort {i + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {cohort.size.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cohort.percentageOfTotal.toFixed(2)}% of population
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onPrev} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={onNext}
          disabled={!savedCohorts || savedCohorts.length === 0}
          title={(!savedCohorts || savedCohorts.length === 0) ? "Build and save at least one cohort to continue" : ""}
        >
          {(!savedCohorts || savedCohorts.length === 0) ? "Build a Cohort to Continue" : "Continue to Audience Refinement"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}