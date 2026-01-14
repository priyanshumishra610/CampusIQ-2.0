
**
 * Validation Schemas for Attendance Routes
 * 
 * Defines Zod schemas for request validation on attendance endpoints.
 */

const { z } = require('zod');
const { CommonSchemas } = require('../middleware/validation');

/**
 * Mark attendance request body schema
 */
const markAttendanceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  courseId: z.string().uuid('Invalid course ID format'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], {
    errorMap: () => ({ message: 'Status must be PRESENT, ABSENT, LATE, or EXCUSED' }),
  }),
  remarks: z.string().max(500).optional().nullable(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional().nullable(),
});

/**
 * Bulk mark attendance request body schema
 */
const bulkMarkAttendanceSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  records: z.array(
    z.object({
      studentId: z.string().uuid('Invalid student ID format'),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    })
  ).min(1, 'At least one record is required').max(100, 'Maximum 100 records per request'),
});

/**
 * Get student attendance query schema
 */
const getStudentAttendanceQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  startDate: CommonSchemas.dateString.optional(),
  endDate: CommonSchemas.dateString.optional(),
});

/**
 * Get course attendance query schema
 */
const getCourseAttendanceQuerySchema = z.object({
  date: CommonSchemas.dateString.optional(),
});

/**
 * Attendance route params schemas
 */
const studentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
});

const courseIdParamSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
});

module.exports = {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  getStudentAttendanceQuerySchema,
  getCourseAttendanceQuerySchema,
  studentIdParamSchema,
  courseIdParamSchema,
};
