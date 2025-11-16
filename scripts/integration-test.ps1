# Integration Test Script for Baileys Migration
# This script performs automated checks for the integration testing

param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0
$testsWarning = 0

function Write-TestHeader {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = "",
        [bool]$IsWarning = $false
    )
    
    if ($IsWarning) {
        Write-Host "⚠ $TestName" -ForegroundColor Yellow
        if ($Message) { Write-Host "  $Message" -ForegroundColor Yellow }
        $script:testsWarning++
    }
    elseif ($Passed) {
        Write-Host "✓ $TestName" -ForegroundColor Green
        if ($Message) { Write-Host "  $Message" -ForegroundColor Gray }
        $script:testsPassed++
    }
    else {
        Write-Host "✗ $TestName" -ForegroundColor Red
        if ($Message) { Write-Host "  $Message" -ForegroundColor Red }
        $script:testsFailed++
    }
}

# Start testing
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Baileys Migration - Integration Test Suite            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Test 1: Project Structure
Write-TestHeader "Test 1: Project Structure Verification"

$nodeDir = "src-tauri\whatsapp-node"
if (Test-Path $nodeDir) {
    Write-TestResult "Node.js directory exists" $true
} else {
    Write-TestResult "Node.js directory exists" $false "Directory not found: $nodeDir"
}

$indexJs = Join-Path $nodeDir "index.js"
if (Test-Path $indexJs) {
    Write-TestResult "index.js exists" $true
} else {
    Write-TestResult "index.js exists" $false "File not found: $indexJs"
}

$packageJson = Join-Path $nodeDir "package.json"
if (Test-Path $packageJson) {
    Write-TestResult "package.json exists" $true
} else {
    Write-TestResult "package.json exists" $false "File not found: $packageJson"
}

# Test 2: Dependencies Check
Write-TestHeader "Test 2: Node.js Dependencies Verification"

Push-Location $nodeDir

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-TestResult "node_modules directory exists" $true
    
    # Check for Baileys
    if (Test-Path "node_modules\@whiskeysockets\baileys") {
        Write-TestResult "Baileys is installed" $true
    } else {
        Write-TestResult "Baileys is installed" $false "Baileys not found in node_modules"
    }
    
    # Check for required dependencies
    $requiredDeps = @(
        "@hapi\boom",
        "pino",
        "qrcode"
    )
    
    foreach ($dep in $requiredDeps) {
        $depPath = "node_modules\$dep"
        if (Test-Path $depPath) {
            Write-TestResult "$dep is installed" $true
        } else {
            Write-TestResult "$dep is installed" $false "$dep not found"
        }
    }
    
    # Check for old dependencies (should be removed)
    if (Test-Path "node_modules\whatsapp-web.js") {
        Write-TestResult "whatsapp-web.js removed" $false "Old dependency still present" $true
    } else {
        Write-TestResult "whatsapp-web.js removed" $true
    }
    
    if (Test-Path "node_modules\puppeteer") {
        Write-TestResult "Puppeteer removed" $false "Old dependency still present" $true
    } else {
        Write-TestResult "Puppeteer removed" $true
    }
    
} else {
    Write-TestResult "node_modules directory exists" $false "Dependencies not installed. Run: cd src-tauri\whatsapp-node && npm install"
}

Pop-Location

# Test 3: Auth State Directory
Write-TestHeader "Test 3: Authentication State Verification"

$authDir = Join-Path $nodeDir "auth_info"
if (Test-Path $authDir) {
    Write-TestResult "auth_info directory exists" $true "Session data present"
    
    $credsFile = Join-Path $authDir "creds.json"
    if (Test-Path $credsFile) {
        Write-TestResult "creds.json exists" $true "Authentication credentials found"
        
        # Check file size (should not be empty)
        $fileSize = (Get-Item $credsFile).Length
        if ($fileSize -gt 100) {
            Write-TestResult "creds.json is valid" $true "File size: $fileSize bytes"
        } else {
            Write-TestResult "creds.json is valid" $false "File appears to be empty or corrupted"
        }
    } else {
        Write-TestResult "creds.json exists" $false "No authentication credentials found" $true
    }
    
    # Check for sync keys (multi-device)
    $syncKeys = Get-ChildItem -Path $authDir -Filter "app-state-sync-key-*.json" -ErrorAction SilentlyContinue
    if ($syncKeys.Count -gt 0) {
        Write-TestResult "Multi-device sync keys present" $true "Found $($syncKeys.Count) sync key(s)"
    } else {
        Write-TestResult "Multi-device sync keys present" $false "No sync keys found" $true
    }
} else {
    Write-TestResult "auth_info directory exists" $false "No session data (fresh install or logged out)" $true
}

# Check for old session directory
$oldSessionDir = Join-Path $nodeDir "session"
if (Test-Path $oldSessionDir) {
    Write-TestResult "Old session directory removed" $false "Old session directory still exists" $true
} else {
    Write-TestResult "Old session directory removed" $true
}

# Test 4: Operation Files
Write-TestHeader "Test 4: Operation Files Verification"

$operationsDir = Join-Path $nodeDir "operations"
if (Test-Path $operationsDir) {
    Write-TestResult "operations directory exists" $true
    
    $operationFiles = @(
        "getGroups.js",
        "extractMembers.js",
        "addToGroup.js"
    )
    
    foreach ($file in $operationFiles) {
        $filePath = Join-Path $operationsDir $file
        if (Test-Path $filePath) {
            Write-TestResult "$file exists" $true
        } else {
            Write-TestResult "$file exists" $false "File not found: $filePath"
        }
    }
} else {
    Write-TestResult "operations directory exists" $false "Directory not found: $operationsDir"
}

# Test 5: Code Quality Checks
Write-TestHeader "Test 5: Code Quality Verification"

# Check index.js for Baileys imports
$indexContent = Get-Content $indexJs -Raw
if ($indexContent -match "@whiskeysockets/baileys") {
    Write-TestResult "index.js uses Baileys" $true
} else {
    Write-TestResult "index.js uses Baileys" $false "Baileys import not found"
}

if ($indexContent -match "makeWASocket") {
    Write-TestResult "index.js uses makeWASocket" $true
} else {
    Write-TestResult "index.js uses makeWASocket" $false "makeWASocket not found"
}

if ($indexContent -match "useMultiFileAuthState") {
    Write-TestResult "index.js uses multi-file auth state" $true
} else {
    Write-TestResult "index.js uses multi-file auth state" $false "useMultiFileAuthState not found"
}

# Check for old whatsapp-web.js code
if ($indexContent -match "whatsapp-web\.js") {
    Write-TestResult "Old whatsapp-web.js code removed" $false "References to whatsapp-web.js found" $true
} else {
    Write-TestResult "Old whatsapp-web.js code removed" $true
}

if ($indexContent -match "puppeteer") {
    Write-TestResult "Puppeteer references removed" $false "References to Puppeteer found" $true
} else {
    Write-TestResult "Puppeteer references removed" $true
}

# Test 6: Frontend Integration
Write-TestHeader "Test 6: Frontend Integration Verification"

$whatsappContextPath = "src\contexts\WhatsAppContext.tsx"
if (Test-Path $whatsappContextPath) {
    Write-TestResult "WhatsAppContext exists" $true
} else {
    Write-TestResult "WhatsAppContext exists" $false "File not found: $whatsappContextPath"
}

$useWhatsAppPath = "src\hooks\useWhatsApp.ts"
if (Test-Path $useWhatsAppPath) {
    Write-TestResult "useWhatsApp hook exists" $true
} else {
    Write-TestResult "useWhatsApp hook exists" $false "File not found: $useWhatsAppPath"
}

$connectPagePath = "src\pages\Connect.tsx"
if (Test-Path $connectPagePath) {
    Write-TestResult "Connect page exists" $true
} else {
    Write-TestResult "Connect page exists" $false "File not found: $connectPagePath"
}

# Test 7: Rust Backend
Write-TestHeader "Test 7: Rust Backend Verification"

$mainRsPath = "src-tauri\src\main.rs"
if (Test-Path $mainRsPath) {
    Write-TestResult "main.rs exists" $true
} else {
    Write-TestResult "main.rs exists" $false "File not found: $mainRsPath"
}

$commandsRsPath = "src-tauri\src\commands.rs"
if (Test-Path $commandsRsPath) {
    Write-TestResult "commands.rs exists" $true
    
    # Check for required commands
    $commandsContent = Get-Content $commandsRsPath -Raw
    $requiredCommands = @(
        "initialize_connection",
        "connect_whatsapp",
        "get_groups",
        "extract_group_members",
        "add_users_to_group",
        "logout_whatsapp"
    )
    
    foreach ($cmd in $requiredCommands) {
        if ($commandsContent -match $cmd) {
            Write-TestResult "Command '$cmd' exists" $true
        } else {
            Write-TestResult "Command '$cmd' exists" $false "Command not found in commands.rs"
        }
    }
} else {
    Write-TestResult "commands.rs exists" $false "File not found: $commandsRsPath"
}

# Test 8: Documentation
Write-TestHeader "Test 8: Documentation Verification"

$docs = @(
    "INTEGRATION_TEST_PLAN.md",
    "BAILEYS_TESTING_README.md",
    "AUTH_INFO_STRUCTURE.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-TestResult "$doc exists" $true
    } else {
        Write-TestResult "$doc exists" $false "Documentation file not found" $true
    }
}

# Test 9: Build Configuration
Write-TestHeader "Test 9: Build Configuration Verification"

$packageJsonRoot = "package.json"
if (Test-Path $packageJsonRoot) {
    Write-TestResult "Root package.json exists" $true
    
    $packageContent = Get-Content $packageJsonRoot -Raw | ConvertFrom-Json
    if ($packageContent.scripts."tauri") {
        Write-TestResult "Tauri scripts configured" $true
    } else {
        Write-TestResult "Tauri scripts configured" $false "Tauri scripts not found"
    }
} else {
    Write-TestResult "Root package.json exists" $false
}

$tauriConfPath = "src-tauri\tauri.conf.json"
if (Test-Path $tauriConfPath) {
    Write-TestResult "tauri.conf.json exists" $true
} else {
    Write-TestResult "tauri.conf.json exists" $false
}

# Test Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Test Summary                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed + $testsWarning
$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 2) } else { 0 }

Write-Host "`nTotal Tests Run: $totalTests" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red
Write-Host "Warnings: $testsWarning" -ForegroundColor Yellow
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

# Recommendations
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Recommendations                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($testsFailed -gt 0) {
    Write-Host "`n⚠ Critical issues found. Please fix the failed tests before proceeding." -ForegroundColor Red
    Write-Host "  Review the test output above for details." -ForegroundColor Red
}

if ($testsWarning -gt 0) {
    Write-Host "`n⚠ Warnings detected. These may not be critical but should be reviewed." -ForegroundColor Yellow
}

if ($testsFailed -eq 0 -and $testsWarning -eq 0) {
    Write-Host "`n✓ All automated checks passed!" -ForegroundColor Green
    Write-Host "  You can now proceed with manual integration testing." -ForegroundColor Green
    Write-Host "  Follow the steps in INTEGRATION_TEST_PLAN.md" -ForegroundColor Green
}

# Next Steps
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      Next Steps                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n1. Review the test results above" -ForegroundColor White
Write-Host "2. Fix any failed tests or warnings" -ForegroundColor White
Write-Host "3. Run manual integration tests from INTEGRATION_TEST_PLAN.md" -ForegroundColor White
Write-Host "4. Document test results in the test plan" -ForegroundColor White
Write-Host "5. Mark task 16 as complete when all tests pass" -ForegroundColor White

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  Integration Test Complete                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Exit with appropriate code
if ($testsFailed -gt 0) {
    exit 1
} else {
    exit 0
}
