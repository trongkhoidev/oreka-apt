const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const pg = new Client({ connectionString: process.env.PG_URL });
  
  try {
    await pg.connect();
    console.log('Connected to PostgreSQL');

    // Read migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Create migrations table if it doesn't exist
    await pg.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get applied migrations
    const appliedRes = await pg.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = new Set(appliedRes.rows.map(r => r.version));

    // Apply new migrations
    for (const file of files) {
      const version = file.replace('.sql', '');
      
      if (applied.has(version)) {
        console.log(`✓ Migration ${version} already applied`);
        continue;
      }

      console.log(`Applying migration ${version}...`);
      
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await pg.query('BEGIN');
      try {
        await pg.query(sql);
        await pg.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await pg.query('COMMIT');
        console.log(`✓ Migration ${version} applied successfully`);
      } catch (error) {
        await pg.query('ROLLBACK');
        console.error(`✗ Migration ${version} failed:`, error.message);
        throw error;
      }
    }

    console.log('All migrations completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pg.end();
  }
}

runMigrations();
