# Integration Test Checklist - Quick Reference

**Date**: ******\_\_\_******  
**Tester**: ******\_\_\_******  
**Version**: 1.0.0 (Baileys Migration)  
**Platform**: Windows / macOS / Linux

---

## Pre-Test Setup

- [ ] Application built successfully
- [ ] Node.js dependencies installed (`cd src-tauri/whatsapp-node && npm install`)
- [ ] Test WhatsApp account ready
- [ ] Test groups available (at least 2)
- [ ] Test phone numbers prepared (3-5 numbers)
- [ ] Task Manager / Activity Monitor open
- [ ] Internet connection stable

---

## Automated Tests

```powershell
.\scripts\integration-test.ps1
```

- [ ] Automated tests run successfully
- [ ] Success rate > 90%
- [ ] No critical failures
- [ ] Results documented

**Results**: **\_** / 40 tests passed (\_\_\_\_%)

---

## Manual Tests

### 1. Connection & Authentication ✅

#### 1.1 Fresh Install - QR Code Flow

- [ ] Clear existing session
- [ ] Start application
- [ ] Click "Conectar ao WhatsApp"
- [ ] QR code appears within 5 seconds
- [ ] Scan QR code with phone
- [ ] Connection established
- [ ] Phone number displayed
- [ ] `auth_info` directory created

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 1.2 Session Persistence

- [ ] Close application
- [ ] Restart application
- [ ] No QR code shown
- [ ] Auto-connect within 5 seconds
- [ ] Same phone number displayed

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 1.3 Connection States

- [ ] Initializing state shown
- [ ] Connecting state shown
- [ ] Connected state shown
- [ ] Status badge updates correctly
- [ ] Dashboard accessible when connected

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

### 2. Group Operations 📊

#### 2.1 Fetch Groups

- [ ] Navigate to "Extrair Membros"
- [ ] Groups load automatically
- [ ] All groups displayed
- [ ] Group names correct
- [ ] Admin status indicated

**Group Count**: **\_** (Expected: **\_**)  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 2.2 Extract Members

- [ ] Select a group
- [ ] Click "Extrair membros"
- [ ] Members load within 5 seconds
- [ ] All members displayed
- [ ] Phone numbers correct (no @ symbols)
- [ ] Names displayed (when available)
- [ ] Admin badges shown correctly

**Member Count**: **\_** (Expected: **\_**)  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 2.3 Export JSON

- [ ] Click "Exportar JSON"
- [ ] File dialog opens
- [ ] Save file successfully
- [ ] JSON is valid
- [ ] All data included
- [ ] Success toast shown

**File Location**: ******\_\_\_******  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 2.4 Export CSV

- [ ] Click "Exportar CSV"
- [ ] File dialog opens
- [ ] Save file successfully
- [ ] CSV has headers
- [ ] All data included
- [ ] Success toast shown

**File Location**: ******\_\_\_******  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

### 3. Bulk Add Operations ➕

#### 3.1 Add Single User

- [ ] Navigate to "Adicionar ao Grupo"
- [ ] Select admin group
- [ ] Enter 1 phone number
- [ ] Set delay to 3 seconds
- [ ] Click "Iniciar Adição"
- [ ] Progress bar updates
- [ ] Operation completes
- [ ] Success message shown
- [ ] User added (verified in WhatsApp)

**Time Taken**: **\_** seconds  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 3.2 Bulk Add Multiple Users

- [ ] Enter 3 phone numbers
- [ ] Set delay to 3 seconds
- [ ] Click "Iniciar Adição"
- [ ] Progress updates for each user
- [ ] ~3 second delay between additions
- [ ] Total time ~9 seconds
- [ ] Final report shows counts
- [ ] All users added

**Time Taken**: **\_** seconds (Expected: ~9s)  
**Success Count**: **\_** / 3  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 3.3 Error Handling

- [ ] Enter mix of valid/invalid numbers
- [ ] Click "Iniciar Adição"
- [ ] Valid numbers added
- [ ] Invalid numbers show errors
- [ ] Process continues despite errors
- [ ] Final report accurate
- [ ] Error messages clear

**Valid Added**: **\_** / **\_**  
**Invalid Rejected**: **\_** / **\_**  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

### 4. Dashboard & Events 📈

#### 4.1 Event Monitoring

- [ ] Navigate to Dashboard
- [ ] Perform operations (fetch groups, extract members)
- [ ] Events appear in "Eventos Recentes"
- [ ] Events show in real-time
- [ ] Timestamps accurate
- [ ] Descriptions clear
- [ ] Icons appropriate

**Events Captured**: **\_**  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 4.2 State Synchronization

- [ ] Status updates across all pages
- [ ] QR code appears when generated
- [ ] Phone number updates when connected
- [ ] Error messages display properly
- [ ] Recovery status shows when reconnecting

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

### 5. Error Handling & Recovery 🔄

#### 5.1 Connection Loss

- [ ] Disable network
- [ ] Disconnection detected
- [ ] Status changes to "Desconectado"
- [ ] Re-enable network
- [ ] Auto-reconnection starts
- [ ] Connection restored
- [ ] No QR code required

**Reconnection Time**: **\_** seconds  
**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 5.2 Logout Flow

- [ ] Trigger logout
- [ ] Logout executes
- [ ] `auth_info` cleared
- [ ] Connection terminated
- [ ] No auto-reconnection
- [ ] QR code shown on reconnect

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

### 6. Performance Metrics ⚡

#### 6.1 Memory Usage

- [ ] Monitor in Task Manager
- [ ] Record idle memory
- [ ] Record peak memory
- [ ] Memory returns to idle
- [ ] No memory leaks

**Idle Memory**: **\_** MB (Target: < 100MB)  
**Peak Memory**: **\_** MB (Target: < 200MB)  
**After 10 min**: **\_** MB  
**Status**: PASS / FAIL

#### 6.2 Startup Time

- [ ] Close application
- [ ] Start timer
- [ ] Launch application
- [ ] Stop when connected

**Launch Time**: **\_** s (Target: < 2s)  
**Connection Time**: **\_** s (Target: < 5s)  
**Total Time**: **\_** s (Target: < 7s)  
**Status**: PASS / FAIL

#### 6.3 CPU Usage

- [ ] Monitor idle CPU
- [ ] Monitor during operations
- [ ] CPU returns to idle

**Idle CPU**: **\_** % (Target: < 5%)  
**Peak CPU**: **\_** % (Target: < 20%)  
**Status**: PASS / FAIL

---

### 7. Multi-Device Support 📱

#### 7.1 Linked Devices

- [ ] Open WhatsApp on phone
- [ ] Go to Settings → Linked Devices
- [ ] Application appears in list
- [ ] Device name is "WhatsApp Automation"
- [ ] Other devices remain connected

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

#### 7.2 Multi-Device Sync

- [ ] Send message on mobile
- [ ] Create group on mobile
- [ ] Refresh groups in app
- [ ] New group appears
- [ ] No sync errors

**Status**: PASS / FAIL  
**Notes**: ******\_\_\_******

---

## Test Summary

### Results Overview

| Category           | Tests  | Passed     | Failed     | Success Rate |
| ------------------ | ------ | ---------- | ---------- | ------------ |
| Connection & Auth  | 3      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Group Operations   | 4      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Bulk Add           | 3      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Dashboard & Events | 2      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Error Handling     | 2      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Performance        | 3      | \_\_\_     | \_\_\_     | \_\_\_%      |
| Multi-Device       | 2      | \_\_\_     | \_\_\_     | \_\_\_%      |
| **TOTAL**          | **19** | **\_\_\_** | **\_\_\_** | **\_\_\_%**  |

### Performance Summary

| Metric        | Target  | Actual    | Status  |
| ------------- | ------- | --------- | ------- |
| Memory (Idle) | < 100MB | \_\_\_ MB | ✅ / ❌ |
| Memory (Peak) | < 200MB | \_\_\_ MB | ✅ / ❌ |
| Startup Time  | < 7s    | \_\_\_ s  | ✅ / ❌ |
| CPU (Idle)    | < 5%    | \_\_\_ %  | ✅ / ❌ |
| CPU (Peak)    | < 20%   | \_\_\_ %  | ✅ / ❌ |

### Issues Found

| #   | Description | Severity                       | Status       |
| --- | ----------- | ------------------------------ | ------------ |
| 1   |             | Critical / High / Medium / Low | Open / Fixed |
| 2   |             | Critical / High / Medium / Low | Open / Fixed |
| 3   |             | Critical / High / Medium / Low | Open / Fixed |

---

## Final Assessment

### Overall Status

- [ ] All critical tests passed
- [ ] Performance meets targets
- [ ] No blocking issues
- [ ] Backward compatibility verified
- [ ] Ready for production

### Recommendation

- [ ] ✅ **APPROVED** - Ready for production deployment
- [ ] ⚠️ **APPROVED WITH NOTES** - Minor issues, can deploy with monitoring
- [ ] ❌ **NOT APPROVED** - Critical issues must be fixed

### Comments

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## Sign-off

**Tester Name**: ******\_\_\_******  
**Signature**: ******\_\_\_******  
**Date**: ******\_\_\_******  
**Time**: ******\_\_\_******

**Reviewer Name**: ******\_\_\_******  
**Signature**: ******\_\_\_******  
**Date**: ******\_\_\_******

---

## Next Steps

### If Approved ✅

1. [ ] Mark task 16 as complete
2. [ ] Update documentation
3. [ ] Create release notes
4. [ ] Prepare deployment
5. [ ] Notify stakeholders

### If Not Approved ❌

1. [ ] Document all issues
2. [ ] Prioritize fixes
3. [ ] Create fix tasks
4. [ ] Schedule re-testing
5. [ ] Update timeline

---

**End of Checklist**
