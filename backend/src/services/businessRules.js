/**
 * Business Rules Service
 * Centralizes all hardcoded business rules for maintainability
 */

/**
 * Leave Management Rules
 */
const LeaveRules = {
  /**
   * Determine if HR approval is required for a leave request
   * @param {string} leaveType - Type of leave
   * @param {number} daysCount - Number of days requested
   * @returns {boolean}
   */
  requiresHRApproval: (leaveType, daysCount) => {
    // HR approval required for: Maternity, Paternity, Unpaid, or leaves > 5 days
    return ['MATERNITY', 'PATERNITY', 'UNPAID'].includes(leaveType) || daysCount > 5;
  },

  /**
   * Get maximum leave days allowed per type per year
   * @param {string} leaveType - Type of leave
   * @returns {number}
   */
  getMaxLeaveDays: (leaveType) => {
    const limits = {
      'SICK': 10,
      'CASUAL': 12,
      'EARNED': 15,
      'MATERNITY': 90,
      'PATERNITY': 7,
      'UNPAID': 30,
    };
    return limits[leaveType] || 0;
  },

  /**
   * Check if leave request can be approved (business validation)
   * @param {Object} request - Leave request object
   * @returns {Object} {valid: boolean, reason?: string}
   */
  validateLeaveRequest: (request) => {
    if (request.daysCount <= 0) {
      return {valid: false, reason: 'Leave days must be greater than 0'};
    }
    if (request.daysCount > 30) {
      return {valid: false, reason: 'Leave request exceeds maximum allowed days (30)'};
    }
    if (new Date(request.startDate) > new Date(request.endDate)) {
      return {valid: false, reason: 'Start date must be before end date'};
    }
    return {valid: true};
  },
};

/**
 * Attendance Rules
 */
const AttendanceRules = {
  /**
   * Calculate attendance percentage
   * @param {number} presentDays - Number of days present
   * @param {number} totalDays - Total working days
   * @returns {number} Attendance percentage (0-100)
   */
  calculatePercentage: (presentDays, totalDays) => {
    if (totalDays === 0) return 100;
    return Math.round((presentDays / totalDays) * 100);
  },

  /**
   * Determine attendance risk level
   * @param {number} percentage - Attendance percentage
   * @returns {string} Risk level: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
   */
  getRiskLevel: (percentage) => {
    if (percentage >= 90) return 'LOW';
    if (percentage >= 75) return 'MEDIUM';
    if (percentage >= 60) return 'HIGH';
    return 'CRITICAL';
  },

  /**
   * Check if attendance marking is allowed (e.g., not in future)
   * @param {Date} date - Date to mark attendance
   * @returns {Object} {allowed: boolean, reason?: string}
   */
  canMarkAttendance: (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const markDate = new Date(date);
    markDate.setHours(0, 0, 0, 0);

    if (markDate > today) {
      return {allowed: false, reason: 'Cannot mark attendance for future dates'};
    }

    // Allow marking up to 7 days in the past
    const daysDiff = (today - markDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      return {allowed: false, reason: 'Cannot mark attendance for dates more than 7 days in the past'};
    }

    return {allowed: true};
  },
};

/**
 * Payroll Rules
 */
const PayrollRules = {
  /**
   * Calculate daily rate from monthly salary
   * @param {number} monthlySalary - Monthly salary
   * @param {number} workingDays - Number of working days in month (default: 30)
   * @returns {number} Daily rate
   */
  calculateDailyRate: (monthlySalary, workingDays = 30) => {
    return monthlySalary / workingDays;
  },

  /**
   * Calculate leave deductions
   * @param {number} absentDays - Number of absent days
   * @param {number} dailyRate - Daily salary rate
   * @returns {number} Total deduction amount
   */
  calculateLeaveDeductions: (absentDays, dailyRate) => {
    return absentDays * dailyRate;
  },

  /**
   * Validate payroll record
   * @param {Object} payroll - Payroll record
   * @returns {Object} {valid: boolean, reason?: string}
   */
  validatePayroll: (payroll) => {
    if (payroll.basicSalary < 0) {
      return {valid: false, reason: 'Basic salary cannot be negative'};
    }
    if (payroll.month < 1 || payroll.month > 12) {
      return {valid: false, reason: 'Invalid month'};
    }
    if (payroll.year < 2000 || payroll.year > 2100) {
      return {valid: false, reason: 'Invalid year'};
    }
    return {valid: true};
  },
};

/**
 * State Transition Rules
 */
const StateTransitionRules = {
  /**
   * Valid state transitions for leave requests
   */
  leaveTransitions: {
    'PENDING': ['APPROVED', 'REJECTED', 'CANCELLED'],
    'APPROVED': ['CANCELLED'], // Can cancel approved leave
    'REJECTED': [], // Final state
    'CANCELLED': [], // Final state
  },

  /**
   * Valid state transitions for payroll records
   */
  payrollTransitions: {
    'DRAFT': ['GENERATED', 'CANCELLED'],
    'GENERATED': ['PAID', 'CANCELLED'],
    'PAID': [], // Final state
    'CANCELLED': [], // Final state
  },

  /**
   * Check if state transition is allowed
   * @param {string} entityType - 'leave' | 'payroll' | 'attendance'
   * @param {string} currentState - Current state
   * @param {string} newState - Desired new state
   * @returns {Object} {allowed: boolean, reason?: string}
   */
  canTransition: (entityType, currentState, newState) => {
    let transitions;
    if (entityType === 'leave') {
      transitions = StateTransitionRules.leaveTransitions;
    } else if (entityType === 'payroll') {
      transitions = StateTransitionRules.payrollTransitions;
    } else {
      return {allowed: false, reason: `Unknown entity type: ${entityType}`};
    }

    const allowedStates = transitions[currentState];
    if (!allowedStates) {
      return {allowed: false, reason: `Unknown current state: ${currentState}`};
    }

    if (!allowedStates.includes(newState)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentState} to ${newState}. Allowed transitions: ${allowedStates.join(', ')}`,
      };
    }

    return {allowed: true};
  },
};

module.exports = {
  LeaveRules,
  AttendanceRules,
  PayrollRules,
  StateTransitionRules,
};
