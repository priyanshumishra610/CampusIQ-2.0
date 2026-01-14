/**
 * Student Insight Profiles Routes
 * Unified student view (attendance, performance, behavior flags), risk indicators, faculty-only access
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityRequired} = require('../../middleware/capabilityCheck');
const {AttendanceRules} = require('../../services/businessRules');

const router = express.Router();

// Faculty and admin only
router.use(capabilityRequired('student_insights'));
router.use(authorizeRoles('FACULTY', 'ADMIN', 'HR_ADMIN'));

/**
 * Get student insight profile
 * GET /api/student-insights/:studentId
 */
router.get('/:studentId', authenticateToken, asyncHandler(async (req, res) => {
  const {academicYear, semester} = req.query;

  // Get student info
  const studentResult = await pool.query(
    `SELECT * FROM users WHERE id = $1 AND role = 'STUDENT'`,
    [req.params.studentId]
  );

  assert(studentResult.rows.length > 0, Errors.notFound('Student'));

  const student = studentResult.rows[0];

  // Check permissions - faculty can only see students in their courses
  if (req.user.role === 'FACULTY') {
    const courseCheck = await pool.query(
      `SELECT COUNT(*) as count FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       WHERE ce.student_id = $1 AND c.faculty_id = $2`,
      [req.params.studentId, req.user.id]
    );

    assert(
      parseInt(courseCheck.rows[0].count) > 0,
      Errors.permissionDenied('You can only view insights for students in your courses')
    );
  }

  // Get or create insight record
  const currentYear = academicYear || new Date().getFullYear().toString();
  const currentSemester = semester || 'SPRING';

  let insightResult = await pool.query(
    `SELECT * FROM student_insights
     WHERE student_id = $1 AND academic_year = $2 AND semester = $3`,
    [req.params.studentId, currentYear, currentSemester]
  );

  if (insightResult.rows.length === 0) {
    // Calculate insights
    const insights = await calculateStudentInsights(req.params.studentId, currentYear, currentSemester);
    
    const insertResult = await pool.query(
      `INSERT INTO student_insights (
        student_id, academic_year, semester, overall_attendance_percentage,
        overall_performance_score, risk_level, risk_indicators, behavior_flags,
        attendance_trend, performance_trend, last_updated_by, last_updated_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        req.params.studentId,
        currentYear,
        currentSemester,
        insights.attendancePercentage,
        insights.performanceScore,
        insights.riskLevel,
        insights.riskIndicators,
        insights.behaviorFlags,
        insights.attendanceTrend,
        insights.performanceTrend,
        req.user.id,
      ]
    );

    insightResult = insertResult;
  }

  const insight = insightResult.rows[0];

  // Get attendance details
  const attendanceResult = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days,
       COUNT(*) as total_days,
       COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days,
       COUNT(*) FILTER (WHERE status = 'LATE') as late_days
     FROM attendance
     WHERE student_id = $1
     AND date >= DATE_TRUNC('year', CURRENT_DATE)`,
    [req.params.studentId]
  );

  // Get performance data
  const performanceResult = await pool.query(
    `SELECT 
       AVG(marks_obtained::DECIMAL / max_marks::DECIMAL * 100) as avg_percentage
     FROM assignment_submissions asub
     JOIN assignments a ON asub.assignment_id = a.id
     WHERE asub.student_id = $1
     AND asub.status = 'GRADED'`,
    [req.params.studentId]
  );

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        name: student.name,
        studentId: student.student_id,
        enrollmentNumber: student.enrollment_number,
      },
      insights: {
        academicYear: insight.academic_year,
        semester: insight.semester,
        overallAttendancePercentage: parseFloat(insight.overall_attendance_percentage || 0),
        overallPerformanceScore: parseFloat(insight.overall_performance_score || 0),
        riskLevel: insight.risk_level || 'LOW',
        riskIndicators: insight.risk_indicators || [],
        behaviorFlags: insight.behavior_flags || [],
        attendanceTrend: insight.attendance_trend || 'STABLE',
        performanceTrend: insight.performance_trend || 'STABLE',
      },
      attendance: {
        presentDays: parseInt(attendanceResult.rows[0].present_days || 0),
        totalDays: parseInt(attendanceResult.rows[0].total_days || 0),
        absentDays: parseInt(attendanceResult.rows[0].absent_days || 0),
        lateDays: parseInt(attendanceResult.rows[0].late_days || 0),
      },
      performance: {
        averagePercentage: parseFloat(performanceResult.rows[0].avg_percentage || 0),
      },
    },
  });
}));

/**
 * Calculate student insights
 */
async function calculateStudentInsights(studentId, academicYear, semester) {
  // Calculate attendance percentage
  const attendanceResult = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'PRESENT') as present,
       COUNT(*) as total
     FROM attendance
     WHERE student_id = $1`,
    [studentId]
  );

  const present = parseInt(attendanceResult.rows[0].present || 0);
  const total = parseInt(attendanceResult.rows[0].total || 0);
  const attendancePercentage = total > 0 ? (present / total) * 100 : 100;

  // Calculate performance score
  const performanceResult = await pool.query(
    `SELECT AVG(marks_obtained::DECIMAL / max_marks::DECIMAL * 100) as avg
     FROM assignment_submissions asub
     JOIN assignments a ON asub.assignment_id = a.id
     WHERE asub.student_id = $1 AND asub.status = 'GRADED'`,
    [studentId]
  );

  const performanceScore = parseFloat(performanceResult.rows[0].avg || 0);

  // Determine risk level
  let riskLevel = 'LOW';
  const riskIndicators = [];
  const behaviorFlags = [];

  if (attendancePercentage < 60) {
    riskLevel = 'CRITICAL';
    riskIndicators.push('LOW_ATTENDANCE');
  } else if (attendancePercentage < 75) {
    riskLevel = 'HIGH';
    riskIndicators.push('LOW_ATTENDANCE');
  } else if (attendancePercentage < 85) {
    riskLevel = 'MEDIUM';
  }

  if (performanceScore < 50) {
    riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    riskIndicators.push('LOW_PERFORMANCE');
  }

  // Determine trends (simplified)
  const attendanceTrend = attendancePercentage >= 85 ? 'IMPROVING' : attendancePercentage < 75 ? 'DECLINING' : 'STABLE';
  const performanceTrend = performanceScore >= 70 ? 'IMPROVING' : performanceScore < 50 ? 'DECLINING' : 'STABLE';

  return {
    attendancePercentage: Math.round(attendancePercentage * 100) / 100,
    performanceScore: Math.round(performanceScore * 100) / 100,
    riskLevel,
    riskIndicators,
    behaviorFlags,
    attendanceTrend,
    performanceTrend,
  };
}

module.exports = router;
