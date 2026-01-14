/**
 * Seed System Panels
 * 
 * Creates default system panels for CampusIQ.
 * 
 * Run: node src/database/seed-panels.js
 */

const pool = require('./connection');

const SYSTEM_PANELS = [
  {
    name: 'Super Admin Panel',
    description: 'Full access panel for super administrators',
    themeConfig: {
      primaryColor: '#0ea5e9',
      secondaryColor: '#64748b',
      mode: 'light',
      logoUrl: null,
      faviconUrl: null,
      customCss: null,
    },
    navigationConfig: {
      modules: ['dashboard', 'roles', 'panels', 'capabilities', 'audit-logs'],
      order: ['dashboard', 'roles', 'panels', 'capabilities', 'audit-logs'],
      hidden: [],
    },
    capabilityOverrides: {},
    permissionSet: ['system:*'],
    isSystemPanel: true,
    status: 'published',
  },
  {
    name: 'Operations Panel',
    description: 'Panel for operations team',
    themeConfig: {
      primaryColor: '#10b981',
      secondaryColor: '#6b7280',
      mode: 'light',
      logoUrl: null,
      faviconUrl: null,
      customCss: null,
    },
    navigationConfig: {
      modules: ['dashboard', 'capabilities', 'audit-logs'],
      order: ['dashboard', 'capabilities', 'audit-logs'],
      hidden: [],
    },
    capabilityOverrides: {},
    permissionSet: ['capabilities:view', 'audit:view', 'dashboard:view'],
    isSystemPanel: true,
    status: 'published',
  },
];

async function seedPanels() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Seeding system panels...');
    
    for (const panelData of SYSTEM_PANELS) {
      const result = await client.query(
        `INSERT INTO panels (
          name, description, theme_config, navigation_config,
          capability_overrides, permission_set, is_system_panel, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
        RETURNING id, name`,
        [
          panelData.name,
          panelData.description,
          JSON.stringify(panelData.themeConfig),
          JSON.stringify(panelData.navigationConfig),
          JSON.stringify(panelData.capabilityOverrides),
          panelData.permissionSet,
          panelData.isSystemPanel,
          panelData.status,
        ]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✓ Created panel: ${result.rows[0].name}`);
      } else {
        console.log(`  - Panel already exists: ${panelData.name}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ System panels seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedPanels()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedPanels };
