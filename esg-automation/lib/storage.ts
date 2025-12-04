/**
 * Client-side storage utilities
 * Provides localStorage-based persistence for assessments
 */

export interface StoredAssessment {
  id: string;
  timestamp: string;
  companyInfo: any;
  ddqResult?: any;
  imResult?: any;
  extractedText?: string;
}

const STORAGE_KEY_PREFIX = 'esg_assessment_';
const MAX_STORED_ASSESSMENTS = 10; // Keep last 10 assessments

/**
 * Save assessment to localStorage
 */
export function saveAssessment(assessment: Omit<StoredAssessment, 'id' | 'timestamp'>): string {
  if (typeof window === 'undefined') {
    return ''; // Server-side, no localStorage
  }

  try {
    const id = `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stored: StoredAssessment = {
      id,
      timestamp: new Date().toISOString(),
      ...assessment,
    };

    // Get existing assessments
    const existing = getStoredAssessments();
    
    // Add new assessment
    existing.unshift(stored);
    
    // Keep only last N assessments
    const toKeep = existing.slice(0, MAX_STORED_ASSESSMENTS);
    
    // Save back to localStorage
    localStorage.setItem(`${STORAGE_KEY_PREFIX}list`, JSON.stringify(toKeep));
    
    // Also save individual assessment for quick access
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(stored));
    
    return id;
  } catch (error) {
    console.error('[STORAGE] Failed to save assessment:', error);
    return '';
  }
}

/**
 * Get all stored assessments
 */
export function getStoredAssessments(): StoredAssessment[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}list`);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as StoredAssessment[];
  } catch (error) {
    console.error('[STORAGE] Failed to load assessments:', error);
    return [];
  }
}

/**
 * Get a specific assessment by ID
 */
export function getAssessment(id: string): StoredAssessment | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as StoredAssessment;
  } catch (error) {
    console.error('[STORAGE] Failed to load assessment:', error);
    return null;
  }
}

/**
 * Delete an assessment
 */
export function deleteAssessment(id: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Remove from list
    const assessments = getStoredAssessments();
    const filtered = assessments.filter(a => a.id !== id);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}list`, JSON.stringify(filtered));
    
    // Remove individual entry
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
    
    return true;
  } catch (error) {
    console.error('[STORAGE] Failed to delete assessment:', error);
    return false;
  }
}

/**
 * Clear all stored assessments
 */
export function clearAllAssessments(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const assessments = getStoredAssessments();
    assessments.forEach(assessment => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${assessment.id}`);
    });
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}list`);
    return true;
  } catch (error) {
    console.error('[STORAGE] Failed to clear assessments:', error);
    return false;
  }
}

/**
 * Export assessment as JSON
 */
export function exportAssessmentAsJSON(assessment: StoredAssessment): string {
  return JSON.stringify(assessment, null, 2);
}

/**
 * Export assessment as CSV (simplified)
 */
export function exportAssessmentAsCSV(assessment: StoredAssessment): string {
  const rows: string[] = [];
  
  // Header
  rows.push('Field,Value');
  
  // Company Info
  rows.push(`Company Name,"${assessment.companyInfo?.companyName || ''}"`);
  rows.push(`Sector,"${assessment.companyInfo?.sector || ''}"`);
  rows.push(`Sub-Sector,"${assessment.companyInfo?.subSector || ''}"`);
  rows.push(`Countries,"${assessment.companyInfo?.countriesOfOperation?.join('; ') || ''}"`);
  rows.push(`Employees,"${assessment.companyInfo?.numberOfEmployees || ''}"`);
  
  // DDQ Results (if available)
  if (assessment.ddqResult) {
    rows.push('DDQ Risk Management Items,' + assessment.ddqResult.riskManagement?.length || 0);
    rows.push('DDQ Environment Items,' + assessment.ddqResult.environment?.length || 0);
    rows.push('DDQ Social Items,' + assessment.ddqResult.social?.length || 0);
    rows.push('DDQ Governance Items,' + assessment.ddqResult.governance?.length || 0);
  }
  
  // IM Results (if available)
  if (assessment.imResult) {
    rows.push(`IM Risk Category,"${assessment.imResult.riskCategory || ''}"`);
    rows.push(`IM Gaps Count,${assessment.imResult.gaps?.length || 0}`);
    rows.push(`IM Action Plan Items,${assessment.imResult.actionPlan?.length || 0}`);
  }
  
  rows.push(`Timestamp,"${assessment.timestamp}"`);
  
  return rows.join('\n');
}

