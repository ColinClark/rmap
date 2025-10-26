/**
 * SQL Validator
 * Validates SQL queries before execution to prevent dangerous operations
 * and provide helpful feedback for agent self-correction
 */

import { Logger } from '../../utils/logger';
import ConfigLoader from '../config/ConfigLoader';

const logger = new Logger('SQLValidator');

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'DANGEROUS_KEYWORD' | 'INVALID_TABLE' | 'SYNTAX_ERROR' | 'EMPTY_QUERY';
  message: string;
  suggestion: string;
  position?: number;
}

export interface ValidationWarning {
  type: 'MISSING_LIMIT' | 'BROAD_QUERY' | 'PERFORMANCE' | 'SIZE_WARNING';
  message: string;
  suggestion: string;
  estimatedRows?: number;
}

export class SQLValidator {
  private config = ConfigLoader.getConfig();
  private dangerousKeywords: string[];
  // Table validation removed - MCP server handles table existence
  private readonly TOTAL_POPULATION = 83000000; // SynthiePop total records (estimate)
  private readonly MAX_RECOMMENDED_ROWS = 10000000; // 10M rows warning threshold

  constructor() {
    this.dangerousKeywords = this.config.query.dangerousKeywords.map(k => k.toLowerCase());
  }

  /**
   * Validate SQL query before execution
   */
  validate(sql: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Basic checks
    if (!sql || sql.trim().length === 0) {
      result.valid = false;
      result.errors.push({
        type: 'EMPTY_QUERY',
        message: 'SQL query is empty',
        suggestion: 'Provide a valid SQL query'
      });
      return result;
    }

    const normalizedSQL = sql.toLowerCase().trim();

    // Check for dangerous keywords
    const dangerousKeywordErrors = this.checkDangerousKeywords(normalizedSQL, sql);
    if (dangerousKeywordErrors.length > 0) {
      result.valid = false;
      result.errors.push(...dangerousKeywordErrors);
    }

    // Validate table names
    const tableErrors = this.validateTableNames(normalizedSQL, sql);
    if (tableErrors.length > 0) {
      result.valid = false;
      result.errors.push(...tableErrors);
    }

    // Basic syntax validation
    const syntaxErrors = this.validateSyntax(normalizedSQL, sql);
    if (syntaxErrors.length > 0) {
      result.valid = false;
      result.errors.push(...syntaxErrors);
    }

    // Performance warnings (non-blocking)
    const warnings = this.checkPerformanceWarnings(normalizedSQL);
    result.warnings.push(...warnings);

    // Size estimation (non-blocking)
    const sizeWarnings = this.estimateQuerySize(normalizedSQL);
    result.warnings.push(...sizeWarnings);

    logger.info('SQL validation result', {
      validationPassed: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    });

    return result;
  }

  /**
   * Check for dangerous SQL keywords
   */
  private checkDangerousKeywords(normalizedSQL: string, originalSQL: string): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const keyword of this.dangerousKeywords) {
      // Use word boundaries to avoid false positives (e.g., "dropped" shouldn't match "drop")
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(normalizedSQL)) {
        const position = originalSQL.toLowerCase().indexOf(keyword);
        errors.push({
          type: 'DANGEROUS_KEYWORD',
          message: `Dangerous keyword detected: ${keyword.toUpperCase()}`,
          suggestion: `This operation is not allowed. Use SELECT queries only to retrieve data from the database.`,
          position
        });
      }
    }

    return errors;
  }

  /**
   * Validate that queries only reference allowed tables
   */
  private validateTableNames(normalizedSQL: string, originalSQL: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Extract table references using common patterns
    // Pattern: FROM table_name or JOIN table_name
    const tablePatterns = [
      /\bfrom\s+([a-z_][a-z0-9_]*)/gi,
      /\bjoin\s+([a-z_][a-z0-9_]*)/gi
    ];

    const foundTables = new Set<string>();

    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(normalizedSQL)) !== null) {
        foundTables.add(match[1].toLowerCase());
      }
    }

    // Table validation disabled - let MCP server handle table existence checks
    // The catalog tool will discover available tables dynamically

    return errors;
  }

  /**
   * Basic SQL syntax validation
   */
  private validateSyntax(normalizedSQL: string, originalSQL: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Must start with SELECT (read-only queries)
    if (!normalizedSQL.startsWith('select')) {
      errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Query must start with SELECT',
        suggestion: 'Only SELECT queries are allowed for data retrieval. Example: SELECT * FROM synthie WHERE ...'
      });
    }

    // Check for basic SQL structure issues
    const hasFrom = /\bfrom\b/i.test(normalizedSQL);
    if (!hasFrom && !normalizedSQL.includes('dual')) {
      errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Missing FROM clause',
        suggestion: 'SELECT queries must include a FROM clause. Example: SELECT COUNT(*) FROM synthie'
      });
    }

    // Check for unmatched parentheses
    const openParens = (originalSQL.match(/\(/g) || []).length;
    const closeParens = (originalSQL.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        type: 'SYNTAX_ERROR',
        message: `Unmatched parentheses (${openParens} open, ${closeParens} close)`,
        suggestion: 'Check that all opening parentheses have matching closing parentheses'
      });
    }

    // Check for unclosed quotes
    const singleQuotes = (originalSQL.match(/'/g) || []).length;
    const doubleQuotes = (originalSQL.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Unclosed single quote',
        suggestion: 'Check that all single quotes are properly closed'
      });
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Unclosed double quote',
        suggestion: 'Check that all double quotes are properly closed'
      });
    }

    return errors;
  }

  /**
   * Check for performance issues and provide warnings
   */
  private checkPerformanceWarnings(normalizedSQL: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for SELECT * without LIMIT
    if (normalizedSQL.includes('select *') && !normalizedSQL.includes('limit')) {
      warnings.push({
        type: 'MISSING_LIMIT',
        message: 'SELECT * without LIMIT may return too many rows',
        suggestion: 'Consider adding a LIMIT clause for better performance. Example: SELECT * FROM synthie LIMIT 1000'
      });
    }

    // Check for very broad queries (no WHERE clause)
    const hasWhere = /\bwhere\b/i.test(normalizedSQL);
    const hasLimit = /\blimit\b/i.test(normalizedSQL);

    if (!hasWhere && !hasLimit && !normalizedSQL.includes('count(*)')) {
      warnings.push({
        type: 'BROAD_QUERY',
        message: 'Query has no WHERE clause or LIMIT - may be too broad',
        suggestion: 'Add filters to narrow results. Example: WHERE age > 25 AND city = \'Berlin\''
      });
    }

    // Check for potentially slow operations
    if (normalizedSQL.includes('like \'%')) {
      warnings.push({
        type: 'PERFORMANCE',
        message: 'LIKE with leading wildcard can be slow on large datasets',
        suggestion: 'If possible, avoid leading wildcards (LIKE \'%term\') and use trailing wildcards (LIKE \'term%\') instead'
      });
    }

    return warnings;
  }

  /**
   * Estimate query result size based on WHERE clause analysis
   */
  private estimateQuerySize(normalizedSQL: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Skip COUNT queries - they don't return large result sets
    if (normalizedSQL.includes('count(*)') || normalizedSQL.includes('count (')) {
      return warnings;
    }

    // Check if there's a LIMIT clause
    const limitMatch = normalizedSQL.match(/\blimit\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      // LIMIT is present and reasonable
      if (limit <= this.MAX_RECOMMENDED_ROWS) {
        return warnings;
      }
    }

    // Estimate selectivity based on WHERE clause
    const estimatedRows = this.estimateSelectivity(normalizedSQL);

    if (estimatedRows > this.MAX_RECOMMENDED_ROWS) {
      warnings.push({
        type: 'SIZE_WARNING',
        message: `Query may return too many rows (estimated: ${this.formatNumber(estimatedRows)} rows)`,
        suggestion: `Add more specific filters in WHERE clause or add LIMIT to reduce result size. Recommended: < ${this.formatNumber(this.MAX_RECOMMENDED_ROWS)} rows`,
        estimatedRows
      });
    } else if (estimatedRows > 1000000 && !limitMatch) {
      // Warn for large results without LIMIT even if below max
      warnings.push({
        type: 'SIZE_WARNING',
        message: `Query estimated to return ${this.formatNumber(estimatedRows)} rows without LIMIT`,
        suggestion: 'Consider adding a LIMIT clause for better performance',
        estimatedRows
      });
    }

    return warnings;
  }

  /**
   * Estimate query selectivity (what fraction of rows will be returned)
   */
  private estimateSelectivity(normalizedSQL: string): number {
    // Check for WHERE clause
    const whereMatch = normalizedSQL.match(/\bwhere\s+(.+?)(?:\bgroup by\b|\border by\b|\blimit\b|$)/i);

    if (!whereMatch) {
      // No WHERE clause = returns all rows
      return this.TOTAL_POPULATION;
    }

    const whereClause = whereMatch[1];
    let selectivity = 1.0; // Start assuming all rows match

    // Equality filters (highly selective)
    // e.g., city = 'Berlin', gender = 'M', age = 25
    const equalityCount = (whereClause.match(/\w+\s*=\s*['"][^'"]+['"]/g) || []).length;
    selectivity *= Math.pow(0.01, equalityCount); // Each equality reduces to ~1%

    // Range filters (moderately selective)
    // e.g., age > 25, income BETWEEN 50000 AND 75000
    const rangeCount = (whereClause.match(/\b(>|<|>=|<=|between)\b/gi) || []).length;
    selectivity *= Math.pow(0.3, rangeCount); // Each range reduces to ~30%

    // IN clauses (variable selectivity)
    const inMatches = whereClause.match(/\bin\s*\([^)]+\)/gi) || [];
    inMatches.forEach(inClause => {
      const valueCount = (inClause.match(/,/g) || []).length + 1;
      // Estimate based on number of values in IN clause
      selectivity *= Math.min(valueCount * 0.05, 0.5); // Max 50% for IN clauses
    });

    // LIKE filters (low selectivity unless specific)
    const likeCount = (whereClause.match(/\blike\b/gi) || []).length;
    selectivity *= Math.pow(0.5, likeCount); // Each LIKE reduces to ~50%

    // AND compounds (more selective)
    const andCount = (whereClause.match(/\band\b/gi) || []).length;
    // AND already factored in by counting individual conditions

    // OR dilutes (less selective)
    const orCount = (whereClause.match(/\bor\b/gi) || []).length;
    if (orCount > 0) {
      selectivity *= (1 + orCount * 0.5); // Each OR adds ~50% more rows
    }

    // Ensure selectivity is within bounds [0, 1]
    selectivity = Math.max(0.0001, Math.min(1.0, selectivity));

    const estimatedRows = Math.round(this.TOTAL_POPULATION * selectivity);

    logger.debug('Size estimation', {
      whereClause: whereClause.substring(0, 100),
      selectivity,
      estimatedRows,
      filters: { equalityCount, rangeCount, inCount: inMatches.length, likeCount, andCount, orCount }
    });

    return estimatedRows;
  }

  /**
   * Format large numbers with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  /**
   * Format validation result as human-readable message
   */
  formatValidationMessage(result: ValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
      return 'SQL validation passed';
    }

    const messages: string[] = [];

    if (result.errors.length > 0) {
      messages.push('**Validation Errors:**');
      result.errors.forEach((error, index) => {
        messages.push(`${index + 1}. ${error.message}`);
        messages.push(`   → ${error.suggestion}`);
      });
    }

    if (result.warnings.length > 0) {
      messages.push('\n**Warnings:**');
      result.warnings.forEach((warning, index) => {
        messages.push(`${index + 1}. ${warning.message}`);
        messages.push(`   → ${warning.suggestion}`);
      });
    }

    return messages.join('\n');
  }
}

export default new SQLValidator();
