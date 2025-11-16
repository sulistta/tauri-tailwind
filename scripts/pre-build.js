#!/usr/bin/env node

/**
 * Pre-build script for WhatsApp Automation
 * Ensures whatsapp-node dependencies are installed before building
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const WHATSAPP_NODE_DIR = path.join(
    __dirname,
    '..',
    'src-tauri',
    'whatsapp-node'
)

console.log('🔧 Pre-build: Checking whatsapp-node dependencies...')

// Check if whatsapp-node directory exists
if (!fs.existsSync(WHATSAPP_NODE_DIR)) {
    console.error('❌ Error: whatsapp-node directory not found!')
    process.exit(1)
}

// Check if node_modules exists
const nodeModulesPath = path.join(WHATSAPP_NODE_DIR, 'node_modules')
const packageJsonPath = path.join(WHATSAPP_NODE_DIR, 'package.json')

if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Error: package.json not found in whatsapp-node!')
    process.exit(1)
}

// Install dependencies if node_modules doesn't exist or is empty
if (
    !fs.existsSync(nodeModulesPath) ||
    fs.readdirSync(nodeModulesPath).length === 0
) {
    console.log('📦 Installing whatsapp-node dependencies...')

    try {
        execSync('npm install --production', {
            cwd: WHATSAPP_NODE_DIR,
            stdio: 'inherit'
        })
        console.log('✅ Dependencies installed successfully!')
    } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message)
        process.exit(1)
    }
} else {
    console.log('✅ Dependencies already installed!')
}

// Verify critical dependencies
console.log('🔍 Verifying critical dependencies...')

const criticalDeps = ['whatsapp-web.js', 'qrcode', 'puppeteer']
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

for (const dep of criticalDeps) {
    if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        console.error(
            `❌ Error: Critical dependency '${dep}' not found in package.json!`
        )
        process.exit(1)
    }

    const depPath = path.join(nodeModulesPath, dep)
    if (!fs.existsSync(depPath)) {
        console.error(`❌ Error: Critical dependency '${dep}' not installed!`)
        process.exit(1)
    }
}

console.log('✅ All critical dependencies verified!')

// Clean up session data for fresh build
const sessionPath = path.join(WHATSAPP_NODE_DIR, 'session')
if (fs.existsSync(sessionPath)) {
    console.log('🧹 Cleaning session data for fresh build...')
    try {
        fs.rmSync(sessionPath, { recursive: true, force: true })
        console.log('✅ Session data cleaned!')
    } catch (error) {
        console.warn(
            '⚠️  Warning: Could not clean session data:',
            error.message
        )
    }
}

console.log('✅ Pre-build checks completed successfully!')
