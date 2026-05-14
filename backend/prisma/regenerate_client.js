// Script to regenerate Prisma client
// Run: node prisma/regenerate_client.js

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Regenerating Prisma client...');

try {
  execSync('npx prisma generate', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✓ Prisma client regenerated successfully');
  process.exit(0);
} catch (err) {
  console.error('✗ Failed to regenerate Prisma client:', err.message);
  process.exit(1);
}
