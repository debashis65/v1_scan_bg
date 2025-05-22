/**
 * Helper functions for processing detailed scan results
 */

/**
 * Process and organize detailed results for better dashboard presentation
 */
export function processDetailedResults(detailedResults: any): any {
  if (!detailedResults || !detailedResults.models) {
    return detailedResults; // Return as is if no detailed results
  }
  
  const processed = {
    advanced_measurements: extractModuleResults(detailedResults.models.advanced_measurements),
    pressure_distribution: extractModuleResults(detailedResults.models.pressure_distribution),
    arch_type_analysis: extractModuleResults(detailedResults.models.arch_type_analysis),
    validation_results: detailedResults.validation_results || null,
    data_consistency: detailedResults.data_consistency || null,
    processing_metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      processor_info: "Advanced Analysis Processor v1.0"
    }
  };
  
  return processed;
}

/**
 * Extract meaningful results from module data
 */
export function extractModuleResults(module: any): any {
  if (!module || !module.result) {
    return null;
  }
  
  // Extract measurements directly and add result information
  return {
    measurements: module.result.measurements || {},
    analysis_summary: module.result.summary || null,
    recommendations: module.result.recommendations || null,
    warnings: module.result.warnings || null
  };
}