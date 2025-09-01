import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { DataTable } from './DataTable';
import { 
  PlayCircle, 
  Database, 
  AlertCircle, 
  Loader2,
  Download,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface QueryBuilderProps {
  onQueryResult?: (data: any) => void;
  defaultQuery?: string;
}

export function QueryBuilder({ onQueryResult, defaultQuery = '' }: QueryBuilderProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Check MCP connection status
  const checkConnection = async () => {
    try {
      const response = await fetch('/api/query/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'test-tenant'
        }
      });

      const data = await response.json();
      setConnectionStatus(data.healthy ? 'connected' : 'disconnected');
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  };

  React.useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'demo'
        },
        body: JSON.stringify({ query })
      });

      // Check if response is streaming JSONL
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/x-ndjson')) {
        // Handle streaming JSONL response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const rows: any[] = [];
        let metadata: any = {};
        
        if (reader) {
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.type === 'metadata') {
                    metadata = parsed;
                  } else if (parsed.type === 'row') {
                    rows.push(parsed.data);
                  }
                } catch (e) {
                  console.error('Failed to parse JSONL line:', line);
                }
              }
            }
          }
        }
        
        const result = {
          success: true,
          data: rows,
          metadata: {
            rowCount: metadata.rowCount,
            executionTime: metadata.executionTime,
            columns: metadata.columns
          }
        };
        
        setResults(result);
        
        if (onQueryResult) {
          onQueryResult(result);
        }
      } else {
        // Handle regular JSON response
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Query execution failed');
        }

        setResults(data);
        
        if (onQueryResult) {
          onQueryResult(data);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const getSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/query/schema', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'test-tenant'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch schema');
      }

      // Display schema in results
      setResults({
        success: true,
        data: data.schema,
        metadata: { type: 'schema' }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDatabases = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/query/databases', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'test-tenant'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch databases');
      }

      // Display databases in results
      setResults({
        success: true,
        data: data.databases,
        metadata: { type: 'databases' }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatResults = () => {
    if (!results || !results.data) return null;

    // If it's schema data
    if (results.metadata?.type === 'schema') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Database Schema</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(results.data, null, 2)}
          </pre>
        </div>
      );
    }

    // If it's databases list
    if (results.metadata?.type === 'databases') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Databases</h3>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(results.data, null, 2)}
          </pre>
        </div>
      );
    }

    // If it's query results
    if (Array.isArray(results.data) && results.data.length > 0) {
      // Use DataTable component for tabular data
      return <DataTable data={results.data} pageSize={25} />;
    }

    if (results.data && results.data.length === 0) {
      return <div className="text-muted-foreground">Query returned no results</div>;
    }

    return <div className="text-muted-foreground">No results to display</div>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Query Interface
            </CardTitle>
            <CardDescription>
              Execute SQL queries to explore your data
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'disconnected' && (
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Query Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SQL Query
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={getDatabases}
                  disabled={loading}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Databases
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={getSchema}
                  disabled={loading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Schema
                </Button>
              </div>
            </div>
            <Textarea
              placeholder="Enter SQL query, e.g.: SELECT * FROM customers LIMIT 10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Execute query on Ctrl+Enter or Cmd+Enter
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (!loading && query.trim()) {
                    executeQuery();
                  }
                }
              }}
              className="font-mono text-sm"
              rows={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Button 
              onClick={executeQuery} 
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Execute Query
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Example SQL Queries</h4>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-mono"
                onClick={() => setQuery("SELECT COUNT(*) FROM customers")}
              >
                <MessageSquare className="h-3 w-3 mr-2" />
                SELECT COUNT(*) FROM customers
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-mono"
                onClick={() => setQuery("SELECT * FROM products ORDER BY revenue DESC LIMIT 5")}
              >
                <MessageSquare className="h-3 w-3 mr-2" />
                SELECT * FROM products ORDER BY revenue DESC LIMIT 5
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-mono"
                onClick={() => setQuery("SELECT segment, AVG(order_value) FROM customers GROUP BY segment")}
              >
                <MessageSquare className="h-3 w-3 mr-2" />
                SELECT segment, AVG(order_value) FROM customers GROUP BY segment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-mono"
                onClick={() => setQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")}
              >
                <MessageSquare className="h-3 w-3 mr-2" />
                SELECT table_name FROM information_schema.tables
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Results
                {results.metadata?.rowCount !== undefined && (
                  <Badge variant="secondary">{results.metadata.rowCount} rows</Badge>
                )}
              </h3>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {results.metadata?.executionTime && (
                  <span>Execution Time: {results.metadata.executionTime}ms</span>
                )}
                {results.metadata?.database && (
                  <span>Database: {results.metadata.database}</span>
                )}
              </div>
            </div>
            
            {formatResults()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}