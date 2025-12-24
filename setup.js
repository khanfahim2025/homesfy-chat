#!/usr/bin/env node

/**
 * Cross-platform setup script for Homesfy Chat Buddy
 * Works on Windows, macOS, and Linux
 * 
 * Usage: node setup.js
 */

import { execSync, spawn } from 'child_process';
import { existsSync, copyFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if command exists
function commandExists(command) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

// Get Node.js version
function getNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    return version.replace('v', '');
  } catch {
    return null;
  }
}

// Get npm version
function getNpmVersion() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    return version;
  } catch {
    return null;
  }
}

// Parse version string to compare
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

// Compare versions
function compareVersion(version1, version2) {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

// Check Node.js version requirement
function checkNodeVersion() {
  logStep('1', 'Checking Node.js installation...');
  
  if (!commandExists('node')) {
    logError('Node.js is not installed!');
    logInfo('Please install Node.js 18.0.0 or higher from: https://nodejs.org/');
    logInfo('Or use nvm (Node Version Manager) to install it.');
    process.exit(1);
  }
  
  const nodeVersion = getNodeVersion();
  const requiredVersion = '18.0.0';
  
  logInfo(`Found Node.js version: ${nodeVersion}`);
  
  if (compareVersion(nodeVersion, requiredVersion) < 0) {
    logError(`Node.js version ${nodeVersion} is too old!`);
    logInfo(`Required: ${requiredVersion} or higher`);
    logInfo('Please update Node.js from: https://nodejs.org/');
    process.exit(1);
  }
  
  logSuccess(`Node.js ${nodeVersion} is compatible`);
  return true;
}

// Check npm installation
function checkNpm() {
  logStep('2', 'Checking npm installation...');
  
  if (!commandExists('npm')) {
    logError('npm is not installed!');
    logInfo('npm should come with Node.js. Please reinstall Node.js.');
    process.exit(1);
  }
  
  const npmVersion = getNpmVersion();
  logInfo(`Found npm version: ${npmVersion}`);
  logSuccess('npm is installed');
  return true;
}

// Run npm install in a directory
function installDependencies(dir, name) {
  return new Promise((resolve, reject) => {
    logInfo(`Installing dependencies for ${name}...`);
    
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    const installProcess = spawn(npmCmd, ['install'], {
      cwd: dir,
      stdio: 'inherit',
      shell: true,
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${name} dependencies installed`);
        resolve();
      } else {
        logError(`Failed to install ${name} dependencies`);
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
    
    installProcess.on('error', (error) => {
      logError(`Error installing ${name} dependencies: ${error.message}`);
      reject(error);
    });
  });
}

// Install all dependencies
async function installAllDependencies() {
  logStep('3', 'Installing project dependencies...');
  
  try {
    // Root dependencies
    await installDependencies(__dirname, 'Root');
    
    // API dependencies
    await installDependencies(path.join(__dirname, 'apps', 'api'), 'API');
    
    // Dashboard dependencies
    await installDependencies(path.join(__dirname, 'apps', 'dashboard'), 'Dashboard');
    
    // Widget dependencies
    await installDependencies(path.join(__dirname, 'apps', 'widget'), 'Widget');
    
    logSuccess('All dependencies installed successfully!');
  } catch (error) {
    logError('Failed to install some dependencies');
    logInfo('You can try installing manually:');
    logInfo('  npm install');
    logInfo('  cd apps/api && npm install');
    logInfo('  cd apps/dashboard && npm install');
    logInfo('  cd apps/widget && npm install');
    process.exit(1);
  }
}

// Setup .env file
function setupEnvFile() {
  logStep('4', 'Setting up environment file...');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (existsSync(envPath)) {
    logInfo('.env file already exists');
    logWarning('Skipping .env creation. Edit .env manually if needed.');
    return;
  }
  
  if (existsSync(envExamplePath)) {
    try {
      copyFileSync(envExamplePath, envPath);
      logSuccess('.env file created from .env.example');
      logInfo('Please edit .env file and add your configuration');
    } catch (error) {
      logError(`Failed to create .env file: ${error.message}`);
      logInfo('You can manually copy .env.example to .env');
    }
  } else {
    // Create minimal .env if .env.example doesn't exist
    const minimalEnv = `# Homesfy Chat Buddy - Environment Variables
# Generated by setup script

# API Configuration
API_PORT=4000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5002

# Dashboard Authentication (for development)
VITE_DASHBOARD_USERNAME=admin
VITE_DASHBOARD_PASSWORD=admin

# Database Configuration (optional for development)
# Uncomment and configure if you have MySQL:
# MYSQL_HOST=localhost
# MYSQL_USER=root
# MYSQL_PASSWORD=your_password
# MYSQL_DATABASE=homesfy_chat
# MYSQL_PORT=3306
`;
    
    try {
      writeFileSync(envPath, minimalEnv);
      logSuccess('.env file created with minimal configuration');
      logInfo('For production, edit .env and add your database configuration');
    } catch (error) {
      logError(`Failed to create .env file: ${error.message}`);
    }
  }
}

// Check for required directories
function checkDirectories() {
  logStep('5', 'Checking project structure...');
  
  const requiredDirs = [
    'apps/api',
    'apps/dashboard',
    'apps/widget',
    'apps/api/src',
    'apps/dashboard/src',
    'apps/widget/src',
  ];
  
  let allExist = true;
  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, dir);
    if (!existsSync(dirPath)) {
      logError(`Missing directory: ${dir}`);
      allExist = false;
    }
  }
  
  if (allExist) {
    logSuccess('Project structure is valid');
  } else {
    logError('Project structure is incomplete');
    logInfo('Make sure you cloned/downloaded the complete project');
    process.exit(1);
  }
}

// Main setup function
async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('  Homesfy Chat Buddy - Setup Script', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');
  
  try {
    // Check prerequisites
    checkNodeVersion();
    checkNpm();
    
    // Check project structure
    checkDirectories();
    
    // Install dependencies
    await installAllDependencies();
    
    // Setup .env file
    setupEnvFile();
    
    // Final summary
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
    logSuccess('Setup completed successfully!');
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
    
    log('\n📋 Next Steps:', 'bright');
    log('1. Edit .env file and configure your settings (if needed)');
    log('2. For development without MySQL, .env is already configured');
    log('3. Run: npm start');
    log('4. Open Dashboard: http://localhost:5173');
    log('5. API will run on: http://localhost:4000\n');
    
    logInfo('For production deployment, configure MySQL in .env file');
    logInfo('See README.md for more information\n');
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run setup
main();

