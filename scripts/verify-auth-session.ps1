# Baileys Authentication and Session Verification Script
# This script helps verify the auth_info directory structure and session state

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("check", "clean", "backup", "restore", "info")]
    [string]$Action = "check"
)

$AuthInfoPath = "src-tauri\whatsapp-node\auth_info"
$BackupPath = "src-tauri\whatsapp-node\auth_info.backup"

function Show-Header {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Check-Session {
    Show-Header "Session Status Check"
    
    # Check if auth_info directory exists
    if (Test-Path $AuthInfoPath) {
        Write-Host "✓ auth_info directory exists" -ForegroundColor Green
        
        # Check for creds.json
        $credsPath = Join-Path $AuthInfoPath "creds.json"
        if (Test-Path $credsPath) {
            $credsSize = (Get-Item $credsPath).Length
            Write-Host "✓ creds.json exists (Size: $([math]::Round($credsSize/1KB, 2)) KB)" -ForegroundColor Green
            
            # Validate JSON
            try {
                $null = Get-Content $credsPath | ConvertFrom-Json
                Write-Host "✓ creds.json is valid JSON" -ForegroundColor Green
            } catch {
                Write-Host "✗ creds.json is INVALID JSON" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ creds.json NOT found" -ForegroundColor Red
        }
        
        # Check for sync key files
        $syncKeys = Get-ChildItem $AuthInfoPath -Filter "app-state-sync-key-*.json" -ErrorAction SilentlyContinue
        if ($syncKeys) {
            Write-Host "✓ Found $($syncKeys.Count) sync key file(s)" -ForegroundColor Green
        } else {
            Write-Host "⚠ No sync key files found" -ForegroundColor Yellow
        }
        
        # List all files
        Write-Host "`nFiles in auth_info:" -ForegroundColor Cyan
        Get-ChildItem $AuthInfoPath | Format-Table Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}, LastWriteTime -AutoSize
        
        # Session status
        if ((Test-Path $credsPath) -and $credsSize -gt 0) {
            Write-Host "`n✓ SESSION EXISTS - App should connect without QR code" -ForegroundColor Green
        } else {
            Write-Host "`n⚠ NO VALID SESSION - App will show QR code" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ auth_info directory NOT found" -ForegroundColor Red
        Write-Host "⚠ NO SESSION - App will show QR code on first start" -ForegroundColor Yellow
    }
}

function Clean-Session {
    Show-Header "Clean Session"
    
    if (Test-Path $AuthInfoPath) {
        Write-Host "Removing auth_info directory..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $AuthInfoPath
        Write-Host "✓ Session cleaned successfully" -ForegroundColor Green
        Write-Host "⚠ Next app start will require QR code scan" -ForegroundColor Yellow
    } else {
        Write-Host "⚠ No session to clean (auth_info doesn't exist)" -ForegroundColor Yellow
    }
}

function Backup-Session {
    Show-Header "Backup Session"
    
    if (Test-Path $AuthInfoPath) {
        if (Test-Path $BackupPath) {
            Write-Host "⚠ Backup already exists. Removing old backup..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force $BackupPath
        }
        
        Write-Host "Creating backup..." -ForegroundColor Yellow
        Copy-Item -Recurse $AuthInfoPath $BackupPath
        Write-Host "✓ Session backed up successfully to: $BackupPath" -ForegroundColor Green
    } else {
        Write-Host "✗ No session to backup (auth_info doesn't exist)" -ForegroundColor Red
    }
}

function Restore-Session {
    Show-Header "Restore Session"
    
    if (Test-Path $BackupPath) {
        if (Test-Path $AuthInfoPath) {
            Write-Host "⚠ Current session exists. Removing..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force $AuthInfoPath
        }
        
        Write-Host "Restoring backup..." -ForegroundColor Yellow
        Copy-Item -Recurse $BackupPath $AuthInfoPath
        Write-Host "✓ Session restored successfully from: $BackupPath" -ForegroundColor Green
    } else {
        Write-Host "✗ No backup found to restore" -ForegroundColor Red
    }
}

function Show-Info {
    Show-Header "Session Information"
    
    Write-Host "Auth Info Path: $AuthInfoPath" -ForegroundColor Cyan
    Write-Host "Backup Path: $BackupPath" -ForegroundColor Cyan
    
    Write-Host "`nExpected Files:" -ForegroundColor Cyan
    Write-Host "  - creds.json (authentication credentials)"
    Write-Host "  - app-state-sync-key-*.json (multi-device sync keys)"
    
    Write-Host "`nUsage:" -ForegroundColor Cyan
    Write-Host "  .\scripts\verify-auth-session.ps1 -Action check    # Check session status"
    Write-Host "  .\scripts\verify-auth-session.ps1 -Action clean    # Remove session (force QR)"
    Write-Host "  .\scripts\verify-auth-session.ps1 -Action backup   # Backup current session"
    Write-Host "  .\scripts\verify-auth-session.ps1 -Action restore  # Restore backed up session"
    Write-Host "  .\scripts\verify-auth-session.ps1 -Action info     # Show this information"
}

# Execute action
switch ($Action) {
    "check" { Check-Session }
    "clean" { Clean-Session }
    "backup" { Backup-Session }
    "restore" { Restore-Session }
    "info" { Show-Info }
}

Write-Host ""
