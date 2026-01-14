
**
 * Validation Schemas for Employee Routes
 * 
 * Defines Zod schemas for request validation on employee management endpoints.
 */

const { z } = require('zod');
const { CommonSchemas } = require('../middleware/validation');

/**
 * Get employees query schema
 */
const getEmployeesQuerySchema = z.object({
  department: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).optional(),
  search: z.string().max(255).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Employee ID param schema
 */
const employeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee ID format'),
});

/**
 * Create employee body schema
 */
const createEmployeeSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional().nullable(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  email: CommonSchemas.email,
  phoneNumber: z.string().max(20).optional().nullable(),
  department: z.string().min(1, 'Department is required').max(100),
  designation: z.string().min(1, 'Designation is required').max(100),
  joiningDate: CommonSchemas.dateString,
  reportingManagerId: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).default('ACTIVE'),
});

/**
 * Update employee body schema
 */
const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: CommonSchemas.email.optional(),
  phoneNumber: z.string().max(20).optional().nullable(),
  department: z.string().min(1).max(100).optional(),
  designation: z.string().min(1).max(100).optional(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

module.exports = {
  getEmployeesQuerySchema,
  employeeIdParamSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
};
