# Agent Optimization Analysis
## Comparison: RMAP vs Anthropic Agent SDK Best Practices

**Date:** 2025-01-25
**Model Target:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
**Current Model:** Claude Sonnet 4 (claude-sonnet-4-20250514)

---

## Executive Summary

The current RMAP cohort builder implements a basic agent loop with MCP tool integration. However, it lacks critical production features recommended by Anthropic's Agent SDK, including:
- **Memory persistence** across conversations
- **Context management** (editing, compaction)
- **Verification loops** for quality assurance
- **Enhanced tool descriptions** for better LLM understanding
- **Prompt caching** for cost optimization

**Estimated Improvements with Upgrades:**
- 84% reduction in token consumption (via context editing)
- 39% performance improvement (via memory + editing)
- 67% reduction in retrieval failures (via contextual retrieval)
- Better long-running task completion with Sonnet 4.5

---

## 1. Memory Management

### ❌ Current State (RMAP)
```typescript
// cohort.ts lines 94-98
const conversationMessages: any[] = messages.map(msg => ({
  role: msg.role,
  content: msg.content
}));
conversationMessages.push({ role: 'user', content: query });
```

**Problems:**
- No persistence across sessions
- No automatic context cleanup
- Array grows indefinitely → potential context window exhaustion (though model supports 200K input)
- No way to reference past learnings
- `maxTokens: 4096` unnecessarily limits response length (model supports up to 64K output)

### ✅ Anthropic Recommendation
**Memory Tool Pattern** (file-based persistence):
```typescript
// Memory tool allows agents to:
{
  name: 'memory_write',
  description: 'Store information to persistent memory',
  input_schema: {
    filename: string,  // e.g., 'cohort_insights.json'
    content: string
  }
}

{
  name: 'memory_read',
  description: 'Retrieve information from memory',
  input_schema: {
    filename: string
  }
}
```

**Context Editing**:
- Automatically clears stale tool calls/results
- Preserves conversation flow
- Enables 84% token reduction in 100-turn evaluations

**Benefits:**
- Build knowledge bases incrementally
- Maintain project state across sessions
- Reference learnings without keeping in active context
- Store intermediate results separately

### 🎯 Required Changes
1. Implement memory tool with file-based storage
2. Enable Anthropic's context editing API feature
3. Add prompt caching for system prompts
4. Increase maxTokens to 8192 for Sonnet 4.5
5. Store cohort insights, SQL patterns, and user preferences in memory

---

## 2. MCP Tool Integration

### ⚠️ Current State (RMAP)
```typescript
// cohort.ts lines 119-139 - Minimal tool descriptions
{
  name: 'catalog',
  description: 'Get catalog of available fields in the synthie database',
  input_schema: {
    type: 'object',
    properties: {}
  }
}
```

**Problems:**
- Descriptions lack detail and examples
- No error handling guidance
- No pagination or verbosity controls
- Missing parameters for filtering/truncation
- Returns raw technical data (UUIDs, MIME types)

### ✅ Anthropic Recommendation
**Rich Tool Descriptions**:
```typescript
{
  name: 'catalog',
  description: `Explore the schema of the synthie database containing 83M German population records.

Returns information about:
- Available columns (demographics, psychographics, behaviors)
- Data types and value ranges
- Sample values to understand the data
- Suggested filters for common queries

Use this tool when you need to:
- Understand what demographic data is available
- Find the correct column names for a query
- See example values before writing SQL

Example: When asked "show me young professionals", first call catalog to find age and occupation columns.`,

  input_schema: {
    type: 'object',
    properties: {
      database: {
        type: 'string',
        description: 'Database name (default: synthiedb)',
        default: 'synthiedb'
      },
      include_samples: {
        type: 'boolean',
        description: 'Include sample data rows (default: true)',
        default: true
      },
      response_format: {
        type: 'string',
        enum: ['concise', 'detailed'],
        description: 'Concise for IDs only, detailed for full information',
        default: 'detailed'
      }
    }
  }
}
```

**Key Principles:**
1. **Write as if onboarding a new hire** - make implicit context explicit
2. **Provide usage examples** - show when/how to use the tool
3. **Include error guidance** - actionable error messages, not codes
4. **Semantic labeling** - replace UUIDs with meaningful names
5. **Consolidate operations** - combine related actions in one tool

### 🎯 Required Changes
1. Rewrite tool descriptions with rich context and examples
2. Add `response_format` parameter for verbosity control
3. Add pagination parameters (`offset`, `limit`)
4. Implement filtering capabilities in catalog tool
5. Replace technical IDs with semantic labels in responses
6. Add error messages with corrective guidance

---

## 3. Agent Loop Architecture

### ⚠️ Current State (RMAP)
```typescript
// cohort.ts lines 105-257 - Basic loop
while (continueConversation && iterations < maxIterations) {
  const response = await anthropicClient.messages.create({...});

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const toolResult = await executeToolCall(...);
      conversationMessages.push({role: 'assistant', content: assistantContent});
      conversationMessages.push({role: 'user', content: [{...toolResult}]});
    }
  }

  if (!hasToolUse) continueConversation = false;
}
```

**What's Working:**
- ✅ Basic agentic loop pattern
- ✅ Tool use continuation
- ✅ SSE streaming for real-time feedback
- ✅ Iteration limits (maxIterations: 50)

**What's Missing:**
- ❌ No verification/quality check loops
- ❌ No evaluator-optimizer pattern
- ❌ No subagents for parallelization
- ❌ No bash/code generation capabilities
- ❌ Phase tracking not used for control flow
- ❌ No search strategies (agentic vs semantic)

### ✅ Anthropic Recommendation

**Core Pattern**: Gather Context → Take Action → Verify Work → Repeat

**Workflow Patterns to Consider:**
1. **Evaluator-Optimizer** (for cohort building):
   ```typescript
   // Generate cohort SQL
   const sql = await agent.generateSQL(userQuery);

   // Evaluate the SQL
   const evaluation = await evaluator.checkSQL(sql, {
     criteria: ['syntax', 'performance', 'coverage'],
     targetSize: userPreferences.targetSize
   });

   // Optimize based on feedback
   if (evaluation.needsImprovement) {
     sql = await agent.optimizeSQL(sql, evaluation.feedback);
   }
   ```

2. **Orchestrator-Workers** (for complex queries):
   ```typescript
   // Break into subtasks
   const tasks = await orchestrator.plan(complexQuery);

   // Parallel execution with subagents
   const results = await Promise.all(
     tasks.map(task => workerAgent.execute(task))
   );

   // Synthesize results
   const finalCohort = await orchestrator.synthesize(results);
   ```

**Verification Mechanisms:**
- **Rule-Based**: SQL syntax validation, size checks
- **LLM-as-Judge**: Second model evaluates cohort quality
- **User Feedback**: Incorporate user refinements

### 🎯 Required Changes
1. Implement evaluator-optimizer for SQL generation
2. Add SQL validation before execution
3. Create subagents for parallel demographic searches
4. Add bash tool for file operations and debugging
5. Implement code generation for export formats
6. Add verification step with quality metrics

---

## 4. Model Upgrade: Sonnet 4 → Sonnet 4.5

### Current: claude-sonnet-4-20250514

### Target: claude-sonnet-4-5-20250929

**Key Improvements in Sonnet 4.5:**
- **Built-in context awareness** - tracks available tokens
- **Better tool use** - improved function calling accuracy
- **Extended context** - handles longer conversations better
- **Computer use** - can interact with interfaces (if needed)
- **Improved reasoning** - better at complex multi-step tasks

### Configuration Changes Needed

**Current config.yaml**:
```yaml
cohortBuilder:
  llm:
    model: claude-sonnet-4-20250514
    maxTokens: 4096
    temperature: 0.7
```

**Implemented config.yaml** (as of Phase 1):
```yaml
cohortBuilder:
  llm:
    model: claude-sonnet-4-5-20250929
    maxTokens: 32768  # Model supports 64K output, 200K input
    temperature: 0.7
    maxIterations: 50
```

**Future config.yaml** (Phase 2+):
```yaml
cohortBuilder:
  llm:
    model: claude-sonnet-4-5-20250929
    maxTokens: 32768
    temperature: 0.7

    # Planned features (not yet implemented)
    context_management:
      enable_editing: true  # Auto-clear stale tools
      enable_caching: true  # Cache system prompts (DONE via API)

    # Memory configuration (Phase 2)
    memory:
      enabled: true
      storage_path: './memory/{tenantId}'  # Per-tenant memory
      max_files: 100
```

### API Changes Required
```typescript
// Add context editing
const response = await anthropicClient.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  temperature: 0.7,
  system: cohortConfig.llm.systemPrompt,
  messages: conversationMessages,
  tools: enhancedTools,

  // NEW: Enable context editing
  metadata: {
    context_management: {
      enable_editing: true
    }
  },

  // NEW: Enable prompt caching
  system: [{
    type: 'text',
    text: cohortConfig.llm.systemPrompt,
    cache_control: { type: 'ephemeral' }
  }]
});
```

---

## 5. Tool Design Best Practices

### Current Tool Errors
Based on Anthropic's guidance, here are issues with current tools:

#### ❌ Problem: Vague Descriptions
```typescript
// Current
description: 'Get catalog of available fields in the synthie database'

// Should be
description: `Explore the synthie database schema (83M German population records).

**What it returns:**
- Column names, types, and descriptions
- Sample values for each field
- Suggested filters and aggregations

**When to use:**
- Before writing any SQL query
- When you don't know the exact column name
- To understand data structure and values

**Example:**
User asks: "Find young professionals"
→ First call catalog to find age and occupation columns
→ Then write SQL with correct column names

**Tip:** Call this FIRST in every conversation to avoid SQL errors.`
```

#### ❌ Problem: No Error Guidance
```typescript
// Current - executeToolCall returns generic error
return JSON.stringify({
  error: error instanceof Error ? error.message : 'Tool execution failed'
});

// Should return actionable guidance
return JSON.stringify({
  error: {
    message: error.message,
    type: 'SQL_SYNTAX_ERROR',
    suggestion: `Your query has a syntax error near "${errorLocation}".

Try:
1. Use 'synthie' as the table name (not 'synthiedb')
2. Check column names with the catalog tool
3. Example correct query: SELECT COUNT(*) FROM synthie WHERE age > 25`,

    correctExample: "SELECT COUNT(*) FROM synthie WHERE age BETWEEN 25 AND 34"
  }
});
```

#### ❌ Problem: Missing Parameters
Current tools lack:
- `response_format` - control verbosity
- `max_results` - pagination
- `offset` - continuation
- `filter` - narrow results
- `explain` - show execution plan

### 🎯 Required Changes
1. Rewrite all tool descriptions with examples and context
2. Add actionable error messages with correction guidance
3. Implement response format controls (concise/detailed)
4. Add pagination parameters
5. Replace technical IDs with semantic labels
6. Add explain mode for SQL tool

---

## 6. Contextual Retrieval (Future Enhancement)

While not immediately critical, Anthropic's Contextual Retrieval could significantly improve the cohort builder's ability to understand complex demographic queries.

**Current Approach:**
- Direct SQL against database
- No semantic search
- No RAG

**Contextual Retrieval Pattern:**
```typescript
// 1. Generate contextual embeddings for database schema
const contextualSchema = await claude.generateContext({
  chunk: "age: integer field representing person's age",
  document: "SynthiePop database schema - 83M German population records"
});
// Result: "The 'age' field in the SynthiePop database contains the age in years
// of individuals in the 83M synthetic German population dataset..."

// 2. Search with combined approach
const relevantColumns = await search({
  query: "young professionals earning high income",
  methods: ['embeddings', 'bm25'],
  top_k: 20,
  rerank: true
});
```

**Benefits:**
- 49% reduction in retrieval failures with embeddings + BM25
- 67% reduction with reranking added
- Better handling of abstract queries ("premium shoppers")
- Improved column/table discovery

**Cost:** ~$1.02 per million tokens with prompt caching

**Recommendation:** Implement after core agent improvements

---

## 7. Priority Recommendations

### Phase 1: Critical Upgrades (Week 1)
1. **Upgrade to Sonnet 4.5**
   - Update model string in config
   - Increase maxTokens to 8192
   - Test with existing queries

2. **Enhance Tool Descriptions**
   - Rewrite catalog and sql descriptions with examples
   - Add when-to-use guidance
   - Include common pitfalls

3. **Enable Prompt Caching**
   - Add cache_control to system prompt
   - Measure cost savings

4. **Improve Error Messages**
   - Add actionable suggestions to tool errors
   - Include example corrections
   - Show common patterns

### Phase 2: Memory & Context (Week 2)
1. **Implement Memory Tool**
   - File-based storage per tenant
   - memory_write and memory_read tools
   - Store cohort patterns and insights

2. **Enable Context Editing**
   - Add API parameter
   - Test with long conversations
   - Measure token reduction

3. **Add Conversation Summarization**
   - Summarize old context before cleanup
   - Store summaries in memory
   - Reference when needed

### Phase 3: Verification & Quality (Week 3)
1. **SQL Validation**
   - Syntax checking before execution
   - Size estimation
   - Performance hints

2. **Evaluator-Optimizer Pattern**
   - Second LLM call to evaluate results
   - Iterative refinement
   - Quality metrics

3. **User Feedback Loop**
   - Capture refinements
   - Learn from corrections
   - Improve over time

### Phase 4: Advanced Features (Week 4)
1. **Subagents for Parallel Search**
   - Demographic search worker
   - Geographic search worker
   - Behavioral search worker

2. **Code Generation**
   - Generate export scripts
   - Create visualization code
   - Build integration snippets

3. **Contextual Retrieval** (Optional)
   - Schema embeddings
   - BM25 + vector search
   - Reranking

---

## 8. Expected Outcomes

### Performance Improvements
- **Token Efficiency**: 84% reduction with context editing
- **Conversation Length**: 5-10x longer conversations possible
- **Query Accuracy**: 39% improvement with memory
- **Cost Reduction**: 60-70% via caching + editing
- **Response Quality**: Better with enhanced tool descriptions

### User Experience Improvements
- **Session Continuity**: Remember past cohorts and insights
- **Faster Iterations**: Reuse learned patterns
- **Better Errors**: Actionable guidance vs cryptic messages
- **Complex Queries**: Handle multi-step research tasks
- **Quality Assurance**: Verification prevents bad SQL

### Technical Improvements
- **Maintainability**: Clearer tool descriptions
- **Debuggability**: Better logging and memory inspection
- **Scalability**: Subagents for parallel processing
- **Reliability**: Validation before execution
- **Flexibility**: Multiple workflow patterns available

---

## 9. Migration Path

### Step 1: Non-Breaking Changes
✅ Safe to deploy immediately:
- Update model to Sonnet 4.5
- Enhance tool descriptions
- Add prompt caching
- Improve error messages
- Increase maxTokens

### Step 2: Additive Features
⚠️ New functionality, backward compatible:
- Add memory tools (optional)
- Enable context editing (opt-in)
- Add verification tools
- Implement bash tool

### Step 3: Architectural Changes
🔴 Requires testing and migration:
- Refactor agent loop for patterns
- Implement subagents
- Add evaluator-optimizer
- Migrate to Claude Agent SDK (if desired)

### Testing Strategy
1. **A/B Testing**: Run old vs new in parallel
2. **Metrics**: Track accuracy, tokens, completion rate
3. **User Feedback**: Gather qualitative feedback
4. **Gradual Rollout**: 10% → 50% → 100%

---

## 10. Cost Analysis

### Current Monthly Cost (Estimated)
- Model: Sonnet 4
- Average conversation: 20 turns
- Average tokens: ~80K per conversation
- Monthly conversations: 10,000
- **Cost**: ~$2,400/month

### Projected Cost with Optimizations
- Model: Sonnet 4.5 (slightly more expensive)
- Context editing: -84% tokens
- Prompt caching: -50% system prompt tokens
- Average tokens: ~25K per conversation
- **New Cost**: ~$750/month

**Savings**: $1,650/month (69% reduction)

**ROI Timeline**:
- Development: 4 weeks @ $10K = $40K
- Monthly savings: $1,650
- Break-even: 24 months
- 3-year NPV: +$20K

---

## Conclusion

The current RMAP cohort builder has a solid foundation with basic agentic capabilities. However, upgrading to Anthropic's recommended patterns will yield significant improvements in:

1. **Performance** - 84% token reduction, 39% better results
2. **User Experience** - Session memory, better errors, longer conversations
3. **Cost** - 69% reduction in monthly LLM costs
4. **Quality** - Verification loops, better tool use, fewer errors

**Recommended Approach**: Phased implementation starting with low-risk, high-value changes (model upgrade, tool descriptions, caching) before moving to architectural changes (memory, subagents, verification).

**Next Steps**:
1. Get approval for Phase 1 changes
2. Update config.yaml and cohort.ts for Sonnet 4.5
3. Rewrite tool descriptions with examples
4. Enable prompt caching
5. Measure improvements before Phase 2
