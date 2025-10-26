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
  type: 'MISSING_LIMIT' | 'BROAD_QUERY' | 'PERFORMANCE';
  message: string;
  suggestion: string;
}

export class SQLValidator {
  private config = ConfigLoader.getConfig();
  private dangerousKeywords: string[];
  private validTables = ['synthie']; // Only allowed table

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
          suggestion: `This operation is not allowed. Use SELECT queries only to retrieve data from the synthie table.`,
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

    // Check if any referenced table is not in the allowed list
    for (const table of foundTables) {
      if (!this.validTables.includes(table)) {
        errors.push({
          type: 'INVALID_TABLE',
          message: `Invalid table name: ${table}`,
          suggestion: `Only the 'synthie' table is available. Use: SELECT ... FROM synthie WHERE ...`,
          position: originalSQL.toLowerCase().indexOf(table)
        });
      }
    }

    // Special case: Check for common mistake of using database name
    if (normalizedSQL.includes('synthiedb')) {
      errors.push({
        type: 'INVALID_TABLE',
        message: `Invalid table reference: synthiedb`,
        suggestion: `Use the table name 'synthie', not the database name 'synthiedb'. Correct: SELECT ... FROM synthie`,
        position: originalSQL.toLowerCase().indexOf('synthiedb')
      });
    }

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
