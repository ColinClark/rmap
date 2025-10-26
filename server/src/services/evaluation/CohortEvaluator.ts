/**
 * Cohort Evaluator
 * Evaluates cohort quality based on size, diversity, and requirement fit
 * Provides structured feedback for agent refinement
 */

import { Logger } from '../../utils/logger';
import ConfigLoader from '../config/ConfigLoader';

const logger = new Logger('CohortEvaluator');

export interface CohortRequirements {
  targetSize?: number;
  minSize?: number;
  maxSize?: number;
  demographics?: {
    ageRange?: { min?: number; max?: number };
    gender?: string[];
    location?: string[];
    income?: { min?: number; max?: number };
  };
  psychographics?: {
    lifestyle?: string[];
    interests?: string[];
  };
  description?: string; // Original user request
}

export interface CohortData {
  size: number;
  sql: string;
  breakdown?: {
    byAge?: Record<string, number>;
    byGender?: Record<string, number>;
    byLocation?: Record<string, number>;
    byIncome?: Record<string, number>;
  };
}

export interface EvaluationResult {
  qualityScore: number; // 0-100
  passed: boolean; // Score >= threshold
  dimensions: {
    sizeMatch: DimensionScore;
    diversity: DimensionScore;
    requirementFit: DimensionScore;
  };
  issues: EvaluationIssue[];
  suggestions: string[];
  summary: string;
}

export interface DimensionScore {
  score: number; // 0-100
  weight: number; // How important this dimension is
  details: string;
}

export interface EvaluationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  dimension: 'size' | 'diversity' | 'requirements';
  message: string;
  suggestion: string;
}

export class CohortEvaluator {
  private config = ConfigLoader.getConfig();
  private readonly QUALITY_THRESHOLD = 70; // Minimum acceptable quality score
  private readonly TOTAL_POPULATION = 83000000; // SynthiePop total

  /**
   * Evaluate cohort quality against requirements
   */
  evaluate(cohort: CohortData, requirements: CohortRequirements): EvaluationResult {
    logger.info('Evaluating cohort quality', {
      cohortSize: cohort.size,
      hasRequirements: !!requirements.targetSize
    });

    const result: EvaluationResult = {
      qualityScore: 0,
      passed: false,
      dimensions: {
        sizeMatch: this.evaluateSizeMatch(cohort, requirements),
        diversity: this.evaluateDiversity(cohort),
        requirementFit: this.evaluateRequirementFit(cohort, requirements)
      },
      issues: [],
      suggestions: [],
      summary: ''
    };

    // Calculate weighted quality score
    result.qualityScore = this.calculateWeightedScore(result.dimensions);
    result.passed = result.qualityScore >= this.QUALITY_THRESHOLD;

    // Collect issues and suggestions
    this.collectIssues(result, cohort, requirements);
    this.generateSuggestions(result, cohort, requirements);

    // Generate summary
    result.summary = this.generateSummary(result, cohort);

    logger.info('Cohort evaluation complete', {
      qualityScore: result.qualityScore,
      passed: result.passed,
      issueCount: result.issues.length
    });

    return result;
  }

  /**
   * Evaluate how well cohort size matches requirements
   */
  private evaluateSizeMatch(cohort: CohortData, requirements: CohortRequirements): DimensionScore {
    const size = cohort.size;
    let score = 100;
    let details = '';

    // Check against target size
    if (requirements.targetSize) {
      const target = requirements.targetSize;
      const deviation = Math.abs(size - target) / target;

      if (deviation < 0.05) {
        // Within 5% - excellent
        score = 100;
        details = `Size ${this.formatNumber(size)} matches target ${this.formatNumber(target)} perfectly (${(deviation * 100).toFixed(1)}% deviation)`;
      } else if (deviation < 0.15) {
        // Within 15% - good
        score = 85;
        details = `Size ${this.formatNumber(size)} close to target ${this.formatNumber(target)} (${(deviation * 100).toFixed(1)}% deviation)`;
      } else if (deviation < 0.30) {
        // Within 30% - acceptable
        score = 65;
        details = `Size ${this.formatNumber(size)} somewhat off target ${this.formatNumber(target)} (${(deviation * 100).toFixed(1)}% deviation)`;
      } else {
        // Over 30% - poor
        score = 40;
        details = `Size ${this.formatNumber(size)} significantly off target ${this.formatNumber(target)} (${(deviation * 100).toFixed(1)}% deviation)`;
      }
    }

    // Check against min/max bounds
    if (requirements.minSize && size < requirements.minSize) {
      score = Math.min(score, 30);
      details = `Size ${this.formatNumber(size)} below minimum ${this.formatNumber(requirements.minSize)}`;
    }

    if (requirements.maxSize && size > requirements.maxSize) {
      score = Math.min(score, 30);
      details = `Size ${this.formatNumber(size)} exceeds maximum ${this.formatNumber(requirements.maxSize)}`;
    }

    // If no specific requirements, evaluate based on reasonableness
    if (!requirements.targetSize && !requirements.minSize && !requirements.maxSize) {
      const percentOfPopulation = (size / this.TOTAL_POPULATION) * 100;

      if (size === 0) {
        score = 0;
        details = 'Cohort is empty - no matching records found';
      } else if (size < 1000) {
        score = 50;
        details = `Very small cohort (${this.formatNumber(size)} people, ${percentOfPopulation.toFixed(3)}% of population) - may lack statistical significance`;
      } else if (size > 50000000) {
        score = 50;
        details = `Very large cohort (${this.formatNumber(size)} people, ${percentOfPopulation.toFixed(1)}% of population) - may be too broad`;
      } else {
        score = 100;
        details = `Cohort size ${this.formatNumber(size)} (${percentOfPopulation.toFixed(2)}% of population) seems reasonable`;
      }
    }

    return {
      score,
      weight: 0.4, // 40% of total score
      details
    };
  }

  /**
   * Evaluate cohort diversity
   */
  private evaluateDiversity(cohort: CohortData): DimensionScore {
    let score = 100;
    let details = 'No demographic breakdown available';

    // If we have breakdown data, analyze diversity
    if (cohort.breakdown) {
      const diversityScores: number[] = [];

      // Check age diversity
      if (cohort.breakdown.byAge) {
        const ageScore = this.calculateDistributionDiversity(cohort.breakdown.byAge);
        diversityScores.push(ageScore);
      }

      // Check gender diversity
      if (cohort.breakdown.byGender) {
        const genderScore = this.calculateDistributionDiversity(cohort.breakdown.byGender);
        diversityScores.push(genderScore);
      }

      // Check location diversity
      if (cohort.breakdown.byLocation) {
        const locationScore = this.calculateDistributionDiversity(cohort.breakdown.byLocation);
        diversityScores.push(locationScore);
      }

      if (diversityScores.length > 0) {
        score = diversityScores.reduce((a, b) => a + b, 0) / diversityScores.length;
        details = `Average diversity score across ${diversityScores.length} demographic dimensions`;
      }
    }

    return {
      score,
      weight: 0.2, // 20% of total score
      details
    };
  }

  /**
   * Calculate diversity score for a distribution
   * Higher score = more evenly distributed
   */
  private calculateDistributionDiversity(distribution: Record<string, number>): number {
    const values = Object.values(distribution);
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0 || values.length === 0) return 0;

    // Calculate entropy (measure of distribution uniformity)
    let entropy = 0;
    for (const value of values) {
      if (value > 0) {
        const p = value / total;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to 0-100 scale
    const maxEntropy = Math.log2(values.length);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return normalizedEntropy * 100;
  }

  /**
   * Evaluate how well cohort fits stated requirements
   */
  private evaluateRequirementFit(cohort: CohortData, requirements: CohortRequirements): DimensionScore {
    let score = 100;
    const fitIssues: string[] = [];

    // Check demographic requirements
    if (requirements.demographics) {
      const demo = requirements.demographics;

      // Age range check (requires breakdown data)
      if (demo.ageRange && cohort.breakdown?.byAge) {
        const ageBreakdown = cohort.breakdown.byAge;
        const outsideRange = Object.entries(ageBreakdown).some(([ageStr, count]) => {
          const age = parseInt(ageStr);
          if (demo.ageRange!.min && age < demo.ageRange!.min) return count > 0;
          if (demo.ageRange!.max && age > demo.ageRange!.max) return count > 0;
          return false;
        });

        if (outsideRange) {
          fitIssues.push('Some cohort members outside specified age range');
          score -= 20;
        }
      }

      // Gender check
      if (demo.gender && cohort.breakdown?.byGender) {
        const allowedGenders = new Set(demo.gender);
        const hasUnexpected = Object.keys(cohort.breakdown.byGender).some(g => !allowedGenders.has(g));

        if (hasUnexpected) {
          fitIssues.push('Cohort includes genders not in requirements');
          score -= 15;
        }
      }

      // Location check
      if (demo.location && cohort.breakdown?.byLocation) {
        const allowedLocations = new Set(demo.location);
        const hasUnexpected = Object.keys(cohort.breakdown.byLocation).some(loc => !allowedLocations.has(loc));

        if (hasUnexpected) {
          fitIssues.push('Cohort includes locations not in requirements');
          score -= 15;
        }
      }
    }

    const details = fitIssues.length > 0
      ? fitIssues.join('; ')
      : 'Cohort appears to match stated requirements';

    return {
      score: Math.max(0, score),
      weight: 0.4, // 40% of total score
      details
    };
  }

  /**
   * Calculate weighted quality score
   */
  private calculateWeightedScore(dimensions: EvaluationResult['dimensions']): number {
    const { sizeMatch, diversity, requirementFit } = dimensions;

    const weightedScore =
      (sizeMatch.score * sizeMatch.weight) +
      (diversity.score * diversity.weight) +
      (requirementFit.score * requirementFit.weight);

    return Math.round(weightedScore);
  }

  /**
   * Collect issues based on dimension scores
   */
  private collectIssues(result: EvaluationResult, cohort: CohortData, requirements: CohortRequirements): void {
    const { sizeMatch, diversity, requirementFit } = result.dimensions;

    // Size match issues
    if (sizeMatch.score < 50) {
      result.issues.push({
        severity: 'critical',
        dimension: 'size',
        message: sizeMatch.details,
        suggestion: this.getSizeSuggestion(cohort, requirements)
      });
    } else if (sizeMatch.score < 70) {
      result.issues.push({
        severity: 'medium',
        dimension: 'size',
        message: sizeMatch.details,
        suggestion: this.getSizeSuggestion(cohort, requirements)
      });
    }

    // Diversity issues
    if (diversity.score < 50) {
      result.issues.push({
        severity: 'medium',
        dimension: 'diversity',
        message: 'Cohort lacks demographic diversity',
        suggestion: 'Consider broadening filters to include more demographic variation'
      });
    }

    // Requirement fit issues
    if (requirementFit.score < 70) {
      result.issues.push({
        severity: 'high',
        dimension: 'requirements',
        message: requirementFit.details,
        suggestion: 'Refine SQL filters to better match stated requirements'
      });
    }
  }

  /**
   * Generate suggestions for improvement
   */
  private generateSuggestions(result: EvaluationResult, cohort: CohortData, requirements: CohortRequirements): void {
    // Size-based suggestions
    if (requirements.targetSize && cohort.size !== requirements.targetSize) {
      const ratio = cohort.size / requirements.targetSize;

      if (ratio > 1.5) {
        result.suggestions.push('Cohort is too large - add more restrictive filters (e.g., age ranges, income thresholds, specific locations)');
      } else if (ratio < 0.5) {
        result.suggestions.push('Cohort is too small - relax some filters or broaden demographic criteria');
      }
    }

    // Empty cohort
    if (cohort.size === 0) {
      result.suggestions.push('No matching records found - try relaxing filters or checking for typos in location names');
    }

    // Very broad cohort
    const percentOfPopulation = (cohort.size / this.TOTAL_POPULATION) * 100;
    if (percentOfPopulation > 60) {
      result.suggestions.push('Cohort is very broad (>60% of population) - add more specific targeting criteria');
    }
  }

  /**
   * Get size adjustment suggestion
   */
  private getSizeSuggestion(cohort: CohortData, requirements: CohortRequirements): string {
    if (!requirements.targetSize) {
      return 'Consider specifying a target cohort size for better evaluation';
    }

    const current = cohort.size;
    const target = requirements.targetSize;

    if (current > target) {
      const ratio = current / target;
      return `Reduce cohort by ${((ratio - 1) * 100).toFixed(0)}% - add filters like age range, income level, or specific locations`;
    } else if (current < target) {
      const ratio = target / current;
      return `Increase cohort by ${((ratio - 1) * 100).toFixed(0)}% - relax filters or broaden criteria`;
    }

    return 'Cohort size matches target';
  }

  /**
   * Generate evaluation summary
   */
  private generateSummary(result: EvaluationResult, cohort: CohortData): string {
    const parts: string[] = [];

    parts.push(`Quality Score: ${result.qualityScore}/100 (${result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'})`);
    parts.push(`Cohort Size: ${this.formatNumber(cohort.size)} people`);

    if (result.issues.length > 0) {
      parts.push(`Issues Found: ${result.issues.length}`);
    }

    return parts.join(' | ');
  }

  /**
   * Format large numbers with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }
}

export default new CohortEvaluator();
