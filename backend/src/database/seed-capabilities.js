/**
 * Seed Initial Capabilities
 * 
 * Registers all major system capabilities in the capability registry.
 * Run this after creating the capabilities table.
 */

require('dotenv').config();
const pool = require('./connection');
const {registerCapability, CAPABILITY_STATUS} = require('../services/capabilityRegistry');

const CAPABILITIES = [
  {
    id: 'attendance',
    name: 'Attendance Management',
    ownerModule: 'attendance',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'leave',
    name: 'Leave Management',
    ownerModule: 'hr',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'payroll',
    name: 'Payroll Processing',
    ownerModule: 'hr',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'audit',
    name: 'Audit Logging',
    ownerModule: 'audit',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'security',
    name: 'Security Features',
    ownerModule: 'security',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'academic_intelligence',
    name: 'Academic Intelligence',
    ownerModule: 'ai',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'crowd_intelligence',
    name: 'Crowd Intelligence',
    ownerModule: 'ai',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'exports',
    name: 'Data Exports',
    ownerModule: 'admin',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'community',
    name: 'Community Features',
    ownerModule: 'community',
    status: CAPABILITY_STATUS.STABLE,
  },
  // New Feature Capabilities
  {
    id: 'feedback',
    name: 'Feedback & Suggestions',
    ownerModule: 'feedback',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'hr',
    name: 'HR Management',
    ownerModule: 'hr',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'attendance_intelligence',
    name: 'Attendance Intelligence',
    ownerModule: 'attendance',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'substitution',
    name: 'Substitution Allocation',
    ownerModule: 'academic',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'celebrations',
    name: 'Celebrations & Events',
    ownerModule: 'community',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'student_insights',
    name: 'Student Insights',
    ownerModule: 'academic',
    status: CAPABILITY_STATUS.STABLE,
  },
  {
    id: 'smart_suggestions',
    name: 'Smart Suggestions',
    ownerModule: 'ai',
    status: CAPABILITY_STATUS.DEGRADED, // Mark as degraded initially
    reason: 'New feature - monitoring performance',
  },
];

async function seedCapabilities() {
  console.log('🌱 Seeding capabilities...');
  
  try {
    for (const cap of CAPABILITIES) {
      await registerCapability(
        cap.id,
        cap.name,
        cap.ownerModule,
        cap.status,
        cap.reason || null
      );
      console.log(`  ✓ Registered: ${cap.id} (${cap.name})`);
    }
    
    console.log(`\n✅ Successfully registered ${CAPABILITIES.length} capabilities`);
    
    // Show summary
    const result = await pool.query('SELECT status, COUNT(*) as count FROM capabilities GROUP BY status');
    console.log('\n📊 Capability Status Summary:');
    result.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding capabilities:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCapabilities()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed capabilities:', error);
      process.exit(1);
    });
}

module.exports = {seedCapabilities, CAPABILITIES};
