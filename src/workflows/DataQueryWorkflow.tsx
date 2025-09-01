import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { QueryBuilder } from '../components/QueryBuilder';
import { ArrowLeft, Database } from 'lucide-react';

export function DataQueryWorkflow() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-600 bg-opacity-10">
            <Database className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Query</h1>
            <p className="text-muted-foreground">
              Execute SQL queries and explore your data warehouse
            </p>
          </div>
        </div>
      </div>

      {/* Query Builder Component */}
      <QueryBuilder 
        defaultQuery=""
        onQueryResult={(data) => {
          console.log('Query result:', data);
        }}
      />
    </div>
  );
}