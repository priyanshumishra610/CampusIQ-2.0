const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const examRoutes = require('./routes/exams');
const notificationRoutes = require('./routes/notifications');
const announcementRoutes = require('./routes/announcements');
const eventRoutes = require('./routes/events');
const securityRoutes = require('./routes/security');
const ticketRoutes = require('./routes/tickets');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const mapsRoutes = require('./routes/maps');
const timetableRoutes = require('./routes/timetable');
const coursesRoutes = require('./routes/courses');
const hrEmployeeRoutes = require('./routes/hr/employees');
const hrRecruitmentRoutes = require('./routes/hr/recruitment');
const hrLeaveRoutes = require('./routes/hr/leave');
const hrHolidaysRoutes = require('./routes/hr/holidays').router;
const hrPayrollRoutes = require('./routes/hr/payroll');
const hrPerformanceRoutes = require('./routes/hr/performance');
const hrExpenseRoutes = require('./routes/hr/expenses');
const hrComplianceRoutes = require('./routes/hr/compliance');
const hrAttendanceRoutes = require('./routes/hr/attendance');
const auditRoutes = require('./routes/audit');
const adminInsightsRoutes = require('./routes/admin/insights');
const adminCapabilitiesRoutes = require('./routes/admin/capabilities');
const adminRolesRoutes = require('./routes/admin/roles');
const adminPanelsRoutes = require('./routes/admin/panels');
const feedbackRoutes = require('./routes/feedback');
const staffEnrollmentRoutes = require('./routes/hr/staffEnrollment');
const attendanceIntelligenceRoutes = require('./routes/attendanceIntelligence');
const substitutionRoutes = require('./routes/substitution');
const celebrationsRoutes = require('./routes/celebrations');
const communityRoutes = require('./routes/community');
const exportsRoutes = require('./routes/exports');
const superAdminRoutes = require('./routes/admin/superAdmin');
const attendanceBulkRoutes = require('./routes/attendanceBulk');
const studentInsightsRoutes = require('./routes/studentInsights');
const suggestionsRoutes = require('./routes/suggestions');
const leaveEnhancementsRoutes = require('./routes/hr/leaveEnhancements');
const {authenticateToken} = require('./middleware/auth');
const {setupSocketIO} = require('./socket/socketHandler');
const {rateLimiter} = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Health check
app.get('/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// Routes
app.use('/api/auth', rateLimiter('auth'), authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/assignments', authenticateToken, assignmentRoutes);
app.use('/api/exams', authenticateToken, examRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/announcements', authenticateToken, announcementRoutes);
app.use('/api/events', authenticateToken, eventRoutes);
app.use('/api/security', authenticateToken, securityRoutes);
app.use('/api/tickets', authenticateToken, ticketRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/maps', authenticateToken, mapsRoutes);
app.use('/api/timetable', authenticateToken, timetableRoutes);
app.use('/api/courses', authenticateToken, coursesRoutes);
// HR Routes (with rate limiting)
app.use('/api/hr/employees', authenticateToken, rateLimiter('hr'), hrEmployeeRoutes);
app.use('/api/hr/recruitment', authenticateToken, rateLimiter('hr'), hrRecruitmentRoutes);
app.use('/api/hr/leave', authenticateToken, rateLimiter('hr'), hrLeaveRoutes);
app.use('/api/hr/holidays', authenticateToken, rateLimiter('hr'), hrHolidaysRoutes);
app.use('/api/hr/payroll', authenticateToken, rateLimiter('hr'), hrPayrollRoutes);
app.use('/api/hr/performance', authenticateToken, rateLimiter('hr'), hrPerformanceRoutes);
app.use('/api/hr/expenses', authenticateToken, rateLimiter('hr'), hrExpenseRoutes);
app.use('/api/hr/compliance', authenticateToken, rateLimiter('hr'), hrComplianceRoutes);
app.use('/api/hr/attendance', authenticateToken, rateLimiter('attendance'), hrAttendanceRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/admin/insights', adminInsightsRoutes);
app.use('/api/admin/capabilities', adminCapabilitiesRoutes);
app.use('/api/admin/roles', adminRolesRoutes);
app.use('/api/admin/panels', adminPanelsRoutes);
// New Feature Routes
app.use('/api/feedback', authenticateToken, feedbackRoutes);
app.use('/api/hr/staff-enrollment', authenticateToken, staffEnrollmentRoutes);
app.use('/api/attendance-intelligence', authenticateToken, attendanceIntelligenceRoutes);
app.use('/api/substitution', authenticateToken, substitutionRoutes);
app.use('/api/celebrations', authenticateToken, celebrationsRoutes);
app.use('/api/community', authenticateToken, communityRoutes);
app.use('/api/exports', authenticateToken, exportsRoutes);
app.use('/api/admin/super-admin', authenticateToken, superAdminRoutes);
app.use('/api/attendance', authenticateToken, attendanceBulkRoutes);
app.use('/api/student-insights', authenticateToken, studentInsightsRoutes);
app.use('/api/suggestions', authenticateToken, suggestionsRoutes);
app.use('/api/hr/leave', authenticateToken, leaveEnhancementsRoutes);

// Centralized error handler (must be after all routes)
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Setup Socket.IO
setupSocketIO(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 CampusIQ Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = {app, server, io};

