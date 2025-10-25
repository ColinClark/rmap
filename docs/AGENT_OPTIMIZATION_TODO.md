# Agent Optimization Implementation Tracker

**Target Model:** Claude Sonnet 4.5 (claude-sonnet-4.5-20250929)
**Current Model:** Claude Sonnet 4 (claude-sonnet-4-20250514)
**Start Date:** 2025-01-25
**Branch:** feature/agent-optimization

---

## Testing & Commit Strategy

- ✅ Test after each step
- ✅ Commit only on successful test
- ✅ Document test results in this file
- ✅ Rollback on failure

---

## Phase 1: Critical Upgrades (Week 1)

### Step 1.1: Upgrade Model to Sonnet 4.5
- [x] **Task:** Update `server/config.yaml` line 66
  - Change: `model: claude-sonnet-4-20250514`
  - To: `model: claude-sonnet-4-5-20250929` (corrected from 4.5 to 4-5)
- [x] **Task:** Update `server/src/services/config/ConfigLoader.ts` line 237
  - Change: `model: 'claude-sonnet-4-20250514'`
  - To: `model: 'claude-sonnet-4-5-20250929'` (corrected from 4.5 to 4-5)
- [ ] **Test:** Start server, verify model loads without errors
- [ ] **Test:** Send simple cohort query: "Show me 100,000 people aged 25-34"
- [ ] **Test:** Verify response quality matches or exceeds Sonnet 4
- [ ] **Commit:** "feat: Upgrade cohort builder to Claude Sonnet 4.5"
- **Status:** CODE COMPLETE - READY FOR TESTING (model ID corrected)
- **Test Results:**
- **Commit Hash:**

### Step 1.2: Increase Max Tokens
- [ ] **Task:** Update `server/config.yaml` line 70
  - Change: `maxTokens: 4096`
  - To: `maxTokens: 8192`
- [ ] **Test:** Send complex multi-turn conversation (5+ tool uses)
- [ ] **Test:** Verify no context window errors
- [ ] **Test:** Verify longer conversations complete successfully
- [ ] **Commit:** "feat: Increase max tokens to 8192 for longer conversations"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 1.3: Enhance Catalog Tool Description
- [x] **Task:** Update `server/src/routes/cohort.ts` lines 121-126
  - Replace minimal description with rich context, examples, when-to-use guidance
  - Added: What tool returns, when to use it, example usage, available data categories
  - Note: Skipped response_format/include_samples parameters (not supported by current MCP server)
- [ ] **Test:** Query: "What data do you have available?"
- [ ] **Test:** Verify agent provides better context about database schema
- [ ] **Test:** Verify agent calls catalog tool appropriately
- [ ] **Commit:** Combined with Step 1.4
- **Status:** CODE COMPLETE - READY FOR TESTING
- **Test Results:**
- **Commit Hash:**

### Step 1.4: Enhance SQL Tool Description
- [x] **Task:** Update `server/src/routes/cohort.ts` lines 154-215
  - Replace minimal description with execution guidance
  - Added: What tool does, when to use it, query guidelines, example queries
  - Added: Common mistakes to avoid, performance tips
  - Note: Skipped explain parameter (not supported by current MCP server)
- [ ] **Test:** Query: "Find women aged 30-40 in Berlin"
- [ ] **Test:** Verify SQL quality improves
- [ ] **Test:** Verify fewer SQL errors on complex queries
- [ ] **Commit:** "feat: Enhance tool descriptions for Sonnet 4.5 compatibility"
- **Status:** CODE COMPLETE - READY FOR TESTING
- **Test Results:**
- **Commit Hash:**

### Step 1.5: Add Actionable Error Messages
- [ ] **Task:** Update `executeToolCall()` error handling in cohort.ts line 69-72
  - Replace generic error messages with specific guidance
  - Include example corrections
  - Add common pattern suggestions
- [ ] **Test:** Force a SQL syntax error
- [ ] **Test:** Verify error message provides actionable guidance
- [ ] **Test:** Verify agent can self-correct based on error message
- [ ] **Commit:** "feat: Add actionable error messages with correction guidance"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 1.6: Enable Prompt Caching
- [ ] **Task:** Update `server/src/routes/cohort.ts` lines 113-118
  - Modify system prompt to use cache_control
  - Add cache_control: { type: 'ephemeral' } to system prompt
- [ ] **Test:** Send 3 queries in sequence
- [ ] **Test:** Monitor API usage/costs (should see cache hits)
- [ ] **Test:** Verify responses maintain quality
- [ ] **Commit:** "feat: Enable prompt caching for cost optimization"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

---

## Phase 2: Memory & Context Management (Week 2)

### Step 2.1: Create Memory Storage Directory Structure
- [ ] **Task:** Create memory storage system
  - Create: `server/src/services/memory/` directory
  - Create: `server/memory/{tenantId}/` storage structure
  - Add to .gitignore: `/server/memory/`
- [ ] **Test:** Verify directory creation on server startup
- [ ] **Test:** Verify tenant isolation in file paths
- [ ] **Commit:** "feat: Add memory storage directory structure"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 2.2: Implement Memory Service
- [ ] **Task:** Create `server/src/services/memory/MemoryService.ts`
  - Methods: writeMemory(tenantId, filename, content)
  - Methods: readMemory(tenantId, filename)
  - Methods: listMemory(tenantId)
  - Methods: deleteMemory(tenantId, filename)
  - Add file size limits and validation
- [ ] **Test:** Unit test each memory operation
- [ ] **Test:** Verify tenant isolation (can't read other tenant's memory)
- [ ] **Test:** Verify file size limits enforced
- [ ] **Commit:** "feat: Implement memory service with file-based storage"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 2.3: Add Memory Tools to Agent
- [ ] **Task:** Add memory tools to `server/src/routes/cohort.ts`
  - Add memory_write tool definition
  - Add memory_read tool definition
  - Add memory_list tool definition
  - Add tool execution in executeToolCall()
- [ ] **Test:** Query: "Remember that I prefer urban audiences"
- [ ] **Test:** Verify memory is written to file
- [ ] **Test:** New session: "What do you remember about my preferences?"
- [ ] **Test:** Verify memory is read and used
- [ ] **Commit:** "feat: Add memory tools for persistent agent learning"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 2.4: Enable Context Editing (API Feature)
- [ ] **Task:** Update `server/src/routes/cohort.ts` messages.create call
  - Add metadata: { context_management: { enable_editing: true } }
  - Research: Verify Anthropic API supports this parameter
- [ ] **Test:** Long conversation (10+ tool uses)
- [ ] **Test:** Monitor token usage (should see reduction)
- [ ] **Test:** Verify conversation quality maintained
- [ ] **Commit:** "feat: Enable context editing for token efficiency"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 2.5: Implement Conversation Summarization
- [ ] **Task:** Add summarization logic to cohort.ts
  - When iterations > threshold, summarize old context
  - Store summary in memory
  - Clear old messages, keep summary
- [ ] **Test:** Very long conversation (20+ turns)
- [ ] **Test:** Verify summarization occurs
- [ ] **Test:** Verify agent retains context from summary
- [ ] **Commit:** "feat: Add conversation summarization for long sessions"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

---

## Phase 3: Verification & Quality (Week 3)

### Step 3.1: Add SQL Syntax Validation
- [ ] **Task:** Create `server/src/services/validation/SQLValidator.ts`
  - Check for dangerous keywords (DROP, DELETE, etc.)
  - Validate table name (must be 'synthie')
  - Basic syntax checking
  - Return validation errors with suggestions
- [ ] **Test:** Agent generates SQL with syntax error
- [ ] **Test:** Verify validator catches error before execution
- [ ] **Test:** Verify error message helps agent correct SQL
- [ ] **Commit:** "feat: Add SQL validation before execution"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 3.2: Add SQL Size Estimation
- [ ] **Task:** Enhance SQLValidator to estimate result size
  - Parse WHERE clauses for selectivity
  - Estimate rows returned
  - Warn if query too broad (>10M rows)
- [ ] **Test:** Query: "Show me all people in Germany"
- [ ] **Test:** Verify size warning appears
- [ ] **Test:** Verify agent refines query based on warning
- [ ] **Commit:** "feat: Add SQL result size estimation"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 3.3: Implement Evaluator Pattern
- [ ] **Task:** Create `server/src/services/evaluation/CohortEvaluator.ts`
  - Evaluate cohort quality (size, diversity, fit)
  - Check against user requirements
  - Suggest improvements
- [ ] **Test:** Query: "Find 500K premium shoppers"
- [ ] **Test:** Verify evaluator assesses result quality
- [ ] **Test:** Verify suggestions for improvement if needed
- [ ] **Commit:** "feat: Add cohort quality evaluator"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 3.4: Add Iterative Refinement Loop
- [ ] **Task:** Modify agent loop in cohort.ts
  - After SQL execution, evaluate results
  - If quality score < threshold, refine query
  - Limit refinement iterations (max 3)
- [ ] **Test:** Query with ambiguous requirements
- [ ] **Test:** Verify agent refines based on evaluation
- [ ] **Test:** Verify converges to quality result
- [ ] **Commit:** "feat: Add iterative refinement for cohort quality"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 3.5: Add User Feedback Capture
- [ ] **Task:** Add feedback mechanism to cohort endpoint
  - Store user refinements in memory
  - Track common correction patterns
  - Learn from user preferences
- [ ] **Test:** User refines a cohort
- [ ] **Test:** Verify feedback stored in memory
- [ ] **Test:** Next query uses learned preferences
- [ ] **Commit:** "feat: Capture and learn from user feedback"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

---

## Phase 4: Advanced Features (Week 4)

### Step 4.1: Design Subagent Architecture
- [ ] **Task:** Create design document for subagents
  - Define: DemographicSearchAgent
  - Define: GeographicSearchAgent
  - Define: BehavioralSearchAgent
  - Design communication protocol
- [ ] **Review:** Architecture review
- [ ] **Commit:** "docs: Add subagent architecture design"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 4.2: Implement Orchestrator-Worker Pattern
- [ ] **Task:** Create `server/src/services/agents/Orchestrator.ts`
  - Break complex queries into subtasks
  - Coordinate parallel worker execution
  - Synthesize results
- [ ] **Test:** Complex query: "Urban millennials interested in sustainable products with high income"
- [ ] **Test:** Verify parallel execution
- [ ] **Test:** Verify result synthesis
- [ ] **Commit:** "feat: Add orchestrator-worker pattern for complex queries"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 4.3: Add Code Generation Tool
- [ ] **Task:** Add code generation capability
  - Generate export scripts (Python, R, SQL)
  - Generate visualization code
  - Generate API integration snippets
- [ ] **Test:** Request: "Generate Python code to export this cohort"
- [ ] **Test:** Verify code quality and correctness
- [ ] **Test:** Test generated code actually works
- [ ] **Commit:** "feat: Add code generation for cohort export"
- **Status:** NOT STARTED
- **Test Results:**
- **Commit Hash:**

### Step 4.4: Research Contextual Retrieval
- [ ] **Task:** Research implementation of contextual retrieval
  - Evaluate embedding models
  - Design schema embedding strategy
  - Estimate costs and benefits
- [ ] **Document:** Findings in separate document
- [ ] **Decision:** Go/No-go on implementation
- **Status:** NOT STARTED
- **Notes:**

### Step 4.5: Implement Contextual Retrieval (Optional)
- [ ] **Task:** If approved, implement contextual retrieval
  - Generate contextual embeddings for schema
  - Implement BM25 + vector search
  - Add reranking
- [ ] **Test:** Abstract query: "Premium shoppers"
- [ ] **Test:** Verify better column discovery
- [ ] **Test:** Compare vs. current approach
- [ ] **Commit:** "feat: Add contextual retrieval for schema search"
- **Status:** NOT STARTED / OPTIONAL
- **Test Results:**
- **Commit Hash:**

---

## Testing Guidelines

### After Each Step:
1. **Start Fresh:** Restart server to ensure clean state
2. **Manual Testing:** Test via actual UI or API calls
3. **Regression Testing:** Verify existing functionality still works
4. **Performance Check:** Monitor response times and token usage
5. **Error Testing:** Try edge cases and error scenarios

### Test Queries to Use:
- **Simple:** "Show me 100,000 people aged 25-34"
- **Moderate:** "Find women aged 30-40 in Berlin with income > €50,000"
- **Complex:** "Urban millennials interested in sustainable products"
- **Ambiguous:** "Premium shoppers" (requires research/inference)
- **Edge Case:** "Everyone in Germany" (should warn about size)

### Success Criteria:
- ✅ No errors in server logs
- ✅ Response quality equal or better than before
- ✅ Token usage reasonable (track in Anthropic dashboard)
- ✅ Response time acceptable (<30s for complex queries)
- ✅ Memory usage stable (no leaks)

---

## Rollback Procedure

If a step fails testing:
1. **Document failure** in this file under Test Results
2. **Git reset:** `git reset --hard HEAD~1`
3. **Investigate:** Review logs, error messages
4. **Fix:** Make corrections
5. **Re-test:** Run tests again
6. **Commit:** Only after successful testing

---

## Progress Tracking

### Summary Statistics:
- **Total Steps:** 24
- **Completed (Code):** 3 (Steps 1.1, 1.3, 1.4)
- **In Progress:** 0
- **Ready for Testing:** 3
- **Blocked:** 0
- **Skipped:** 0

### Weekly Progress:
- **Week 1 (Phase 1):** 3/6 steps code complete, 0/6 tested & committed
- **Week 2 (Phase 2):** 0/5 steps complete
- **Week 3 (Phase 3):** 0/5 steps complete
- **Week 4 (Phase 4):** 0/5 steps complete (+3 optional)

### Current Status:
**Last Updated:** 2025-01-25
**Current Step:** Steps 1.1, 1.3, 1.4 - Code complete, ready for testing
**Blockers:** None
**Notes:**
- Upgraded model from Sonnet 4 to Sonnet 4.5 (config.yaml + ConfigLoader.ts)
- Fixed model ID: claude-sonnet-4-5-20250929 (dashes, not dots)
- Enhanced both catalog and SQL tool descriptions with rich context, examples, and guidance
- Combined Steps 1.1, 1.3, 1.4 because Sonnet 4.5 requires enhanced tool descriptions to work properly
- Ready to test with query: "Show me 100,000 people aged 25-34"

---

## Cost Tracking

### Baseline (Before Optimization):
- **Model:** Claude Sonnet 4
- **Est. Monthly Cost:** $2,400
- **Avg Tokens/Conversation:** ~80K

### Target (After Phase 1-3):
- **Model:** Claude Sonnet 4.5
- **Est. Monthly Cost:** $750 (-69%)
- **Avg Tokens/Conversation:** ~25K (-69%)

### Actual Results:
- **Phase 1 Complete:** TBD
- **Phase 2 Complete:** TBD
- **Phase 3 Complete:** TBD
- **Phase 4 Complete:** TBD

---

## Notes & Learnings

### Step-Specific Notes:
- **Step 1.1:** Corrected model ID format - use `claude-sonnet-4-5-20250929` (with dashes), NOT `claude-sonnet-4.5-20250929` (with dots). Error message from API was helpful in identifying this.

### General Observations:
- Add general observations about the process

### Future Improvements:
- Track ideas for future enhancements beyond this plan
