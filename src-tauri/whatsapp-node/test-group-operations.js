/**
 * Manual Test Script for Baileys Group Operations
 * 
 * This script tests all group operations with Baileys:
 * - Fetching all groups
 * - Extracting members from a group
 * - Adding single user to group
 * - Bulk add operation with multiple users
 * - Delay between additions
 * - Progress events emission
 * - Group permission errors
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Usage:
 * 1. Ensure WhatsApp is connected (run the main app first to authenticate)
 * 2. Run: node test-group-operations.js
 * 3. Follow the interactive prompts
 */

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test results tracking
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Print colored output
 */
function print(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test header
 */
function printTestHeader(testName) {
    print('\n' + '='.repeat(60), 'cyan');
    print(`TEST: ${testName}`, 'bright');
    print('='.repeat(60), 'cyan');
}

/**
 * Print test result
 */
function printTestResult(testName, passed, message = '') {
    if (passed) {
        print(`✓ ${testName} - PASSED ${message}`, 'green');
        testResults.passed.push(testName);
    } else {
        print(`✗ ${testName} - FAILED ${message}`, 'red');
        testResults.failed.push(testName);
    }
}

/**
 * Print warning
 */
function printWarning(message) {
    print(`⚠ WARNING: ${message}`, 'yellow');
    testResults.warnings.push(message);
}

/**
 * Ask user a question
 */
function ask(question) {
    return new Promise(resolve => {
        rl.question(`${colors.blue}${question}${colors.reset} `, resolve);
    });
}

/**
 * Wait for user confirmation
 */
async function waitForConfirmation(message) {
    const answer = await ask(`${message} (y/n): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Spawn the WhatsApp client process
 */
function spawnWhatsAppClient() {
    return new Promise((resolve, reject) => {
        print('\nStarting WhatsApp client...', 'cyan');
        
        const client = spawn('node', ['index.js'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let isReady = false;
        let eventBuffer = [];
        
        // Handle stdout (events from client)
        client.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                try {
                    const event = JSON.parse(line);
                    eventBuffer.push(event);
                    
                    // Print event
                    print(`[EVENT] ${event.event}`, 'yellow');
                    if (event.data) {
                        console.log(JSON.stringify(event.data, null, 2));
                    }
                    
                    // Check if client is ready
                    if (event.event === 'whatsapp_ready') {
                        isReady = true;
                        resolve({ client, eventBuffer });
                    }
                    
                    // Check for QR code
                    if (event.event === 'whatsapp_qr') {
                        print('\n⚠ QR CODE REQUIRED - Please scan the QR code in the main app', 'yellow');
                    }
                    
                    // Check for errors
                    if (event.event === 'whatsapp_error' || event.event === 'command_error') {
                        printWarning(`Error: ${event.data.message}`);
                    }
                } catch (e) {
                    // Not JSON, might be debug output
                    console.log(line);
                }
            });
        });
        
        // Handle stderr
        client.stderr.on('data', (data) => {
            console.error(`[STDERR] ${data.toString()}`);
        });
        
        // Handle process exit
        client.on('exit', (code) => {
            if (!isReady) {
                reject(new Error(`Client exited with code ${code} before becoming ready`));
            }
        });
        
        // Timeout after 60 seconds
        setTimeout(() => {
            if (!isReady) {
                client.kill();
                reject(new Error('Timeout waiting for client to be ready'));
            }
        }, 60000);
    });
}

/**
 * Send command to client and wait for response
 */
function sendCommand(client, eventBuffer, command, expectedEvent, timeout = 30000) {
    return new Promise((resolve, reject) => {
        // Clear event buffer
        eventBuffer.length = 0;
        
        // Send command
        const commandStr = JSON.stringify(command);
        print(`\n[COMMAND] ${command.type}`, 'cyan');
        console.log(commandStr);
        client.stdin.write(commandStr + '\n');
        
        // Wait for response
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            // Check for expected event
            const event = eventBuffer.find(e => e.event === expectedEvent);
            if (event) {
                clearInterval(checkInterval);
                resolve(event);
                return;
            }
            
            // Check for error events
            const errorEvent = eventBuffer.find(e => 
                e.event === 'command_error' || e.event === 'whatsapp_error'
            );
            if (errorEvent) {
                clearInterval(checkInterval);
                reject(new Error(errorEvent.data.message || 'Command failed'));
                return;
            }
            
            // Check timeout
            if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error(`Timeout waiting for ${expectedEvent}`));
            }
        }, 100);
    });
}

/**
 * Test 1: Fetch all groups
 */
async function testFetchGroups(client, eventBuffer) {
    printTestHeader('Test 1: Fetch All Groups');
    
    try {
        const response = await sendCommand(
            client,
            eventBuffer,
            { type: 'get_groups' },
            'groups_result'
        );
        
        // Verify response structure
        if (!response.data || !Array.isArray(response.data.groups)) {
            printTestResult('Fetch Groups', false, '- Invalid response structure');
            return null;
        }
        
        const groups = response.data.groups;
        print(`\nFound ${groups.length} groups`, 'green');
        
        // Verify group data format
        let formatValid = true;
        groups.forEach((group, index) => {
            if (!group.id || !group.name || typeof group.participantCount !== 'number' || typeof group.isAdmin !== 'boolean') {
                printWarning(`Group ${index} has invalid format`);
                formatValid = false;
            }
        });
        
        if (formatValid) {
            printTestResult('Group Data Format', true, '- All fields present and correct types');
        } else {
            printTestResult('Group Data Format', false, '- Some groups have invalid format');
        }
        
        // Display groups
        print('\nGroups:', 'bright');
        groups.forEach((group, index) => {
            print(`  ${index + 1}. ${group.name} (${group.participantCount} members) ${group.isAdmin ? '[ADMIN]' : ''}`, 'cyan');
            print(`     ID: ${group.id}`, 'cyan');
        });
        
        printTestResult('Fetch Groups', true, `- Retrieved ${groups.length} groups`);
        return groups;
    } catch (error) {
        printTestResult('Fetch Groups', false, `- ${error.message}`);
        return null;
    }
}

/**
 * Test 2: Extract members from a group
 */
async function testExtractMembers(client, eventBuffer, groupId) {
    printTestHeader('Test 2: Extract Members from Group');
    
    try {
        const response = await sendCommand(
            client,
            eventBuffer,
            { type: 'extract_members', group_id: groupId },
            'members_result'
        );
        
        // Verify response structure
        if (!response.data || !Array.isArray(response.data.members)) {
            printTestResult('Extract Members', false, '- Invalid response structure');
            return null;
        }
        
        const members = response.data.members;
        print(`\nFound ${members.length} members`, 'green');
        
        // Verify member data format
        let formatValid = true;
        let phoneNumbersValid = true;
        members.forEach((member, index) => {
            // Check required fields
            if (!member.phoneNumber || typeof member.isAdmin !== 'boolean') {
                printWarning(`Member ${index} has invalid format`);
                formatValid = false;
            }
            
            // Verify phone number parsing (should be digits only, no @ symbol)
            if (member.phoneNumber.includes('@')) {
                printWarning(`Member ${index} phone number not properly parsed: ${member.phoneNumber}`);
                phoneNumbersValid = false;
            }
        });
        
        if (formatValid) {
            printTestResult('Member Data Format', true, '- All fields present and correct types');
        } else {
            printTestResult('Member Data Format', false, '- Some members have invalid format');
        }
        
        if (phoneNumbersValid) {
            printTestResult('Phone Number Parsing', true, '- All phone numbers properly parsed');
        } else {
            printTestResult('Phone Number Parsing', false, '- Some phone numbers not properly parsed');
        }
        
        // Display members (first 10)
        print('\nMembers (showing first 10):', 'bright');
        members.slice(0, 10).forEach((member, index) => {
            const name = member.name || 'No name';
            print(`  ${index + 1}. ${name} - ${member.phoneNumber} ${member.isAdmin ? '[ADMIN]' : ''}`, 'cyan');
        });
        
        if (members.length > 10) {
            print(`  ... and ${members.length - 10} more`, 'cyan');
        }
        
        printTestResult('Extract Members', true, `- Retrieved ${members.length} members`);
        return members;
    } catch (error) {
        printTestResult('Extract Members', false, `- ${error.message}`);
        return null;
    }
}

/**
 * Test 3: Add single user to group
 */
async function testAddSingleUser(client, eventBuffer, groupId, phoneNumber) {
    printTestHeader('Test 3: Add Single User to Group');
    
    try {
        // Track progress events
        const progressEvents = [];
        
        // Listen for progress events
        const originalLength = eventBuffer.length;
        
        const response = await sendCommand(
            client,
            eventBuffer,
            { 
                type: 'add_to_group', 
                group_id: groupId, 
                numbers: [phoneNumber],
                delay: 1
            },
            'automation_finished',
            60000
        );
        
        // Collect progress events
        eventBuffer.slice(originalLength).forEach(event => {
            if (event.event === 'automation_progress') {
                progressEvents.push(event);
            }
        });
        
        // Verify progress events were emitted
        if (progressEvents.length > 0) {
            printTestResult('Progress Events', true, `- ${progressEvents.length} progress events emitted`);
        } else {
            printTestResult('Progress Events', false, '- No progress events emitted');
        }
        
        // Verify response structure
        if (!response.data || !response.data.report) {
            printTestResult('Add Single User', false, '- Invalid response structure');
            return false;
        }
        
        const report = response.data.report;
        print('\nAddition Report:', 'bright');
        print(`  Successful: ${report.successful.length}`, 'green');
        print(`  Failed: ${report.failed.length}`, 'red');
        print(`  Total Processed: ${report.total_processed}`, 'cyan');
        
        // Check if addition was successful
        const success = report.successful.includes(phoneNumber);
        
        if (success) {
            printTestResult('Add Single User', true, `- Successfully added ${phoneNumber}`);
        } else {
            const failedEntry = report.failed.find(f => f.phone_number === phoneNumber);
            const reason = failedEntry ? failedEntry.reason : 'Unknown';
            printTestResult('Add Single User', false, `- Failed to add ${phoneNumber}: ${reason}`);
        }
        
        return success;
    } catch (error) {
        printTestResult('Add Single User', false, `- ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Bulk add operation with delay
 */
async function testBulkAdd(client, eventBuffer, groupId, phoneNumbers, delay) {
    printTestHeader('Test 4: Bulk Add Operation with Delay');
    
    try {
        // Track progress events and timing
        const progressEvents = [];
        const startTime = Date.now();
        
        // Listen for progress events
        const originalLength = eventBuffer.length;
        
        print(`\nAdding ${phoneNumbers.length} users with ${delay}s delay...`, 'cyan');
        
        const response = await sendCommand(
            client,
            eventBuffer,
            { 
                type: 'add_to_group', 
                group_id: groupId, 
                numbers: phoneNumbers,
                delay: delay
            },
            'automation_finished',
            120000 // 2 minutes timeout
        );
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        
        // Collect progress events
        eventBuffer.slice(originalLength).forEach(event => {
            if (event.event === 'automation_progress') {
                progressEvents.push(event);
                print(`  Progress: ${event.data.current}/${event.data.total} - ${event.data.status}`, 'yellow');
            }
        });
        
        // Verify progress events
        if (progressEvents.length === phoneNumbers.length) {
            printTestResult('Progress Events Count', true, `- All ${phoneNumbers.length} progress events emitted`);
        } else {
            printTestResult('Progress Events Count', false, `- Expected ${phoneNumbers.length}, got ${progressEvents.length}`);
        }
        
        // Verify delay timing
        const expectedMinTime = (phoneNumbers.length - 1) * delay;
        if (totalTime >= expectedMinTime) {
            printTestResult('Delay Between Additions', true, `- Took ${totalTime.toFixed(1)}s (expected ≥${expectedMinTime}s)`);
        } else {
            printTestResult('Delay Between Additions', false, `- Took ${totalTime.toFixed(1)}s (expected ≥${expectedMinTime}s)`);
        }
        
        // Verify response structure
        if (!response.data || !response.data.report) {
            printTestResult('Bulk Add Operation', false, '- Invalid response structure');
            return false;
        }
        
        const report = response.data.report;
        print('\nBulk Addition Report:', 'bright');
        print(`  Successful: ${report.successful.length}`, 'green');
        print(`  Failed: ${report.failed.length}`, 'red');
        print(`  Total Processed: ${report.total_processed}`, 'cyan');
        print(`  Total Time: ${totalTime.toFixed(1)}s`, 'cyan');
        
        // Display failed additions
        if (report.failed.length > 0) {
            print('\nFailed Additions:', 'red');
            report.failed.forEach(failure => {
                print(`  - ${failure.phone_number}: ${failure.reason}`, 'red');
            });
        }
        
        printTestResult('Bulk Add Operation', true, `- Processed ${report.total_processed} users`);
        return true;
    } catch (error) {
        printTestResult('Bulk Add Operation', false, `- ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Group permission errors
 */
async function testGroupPermissionErrors(client, eventBuffer, groupId, phoneNumber) {
    printTestHeader('Test 5: Group Permission Errors');
    
    print('\nNote: This test requires a group where you are NOT an admin', 'yellow');
    const proceed = await waitForConfirmation('Do you want to test permission errors?');
    
    if (!proceed) {
        printWarning('Skipping permission error test');
        return;
    }
    
    try {
        const response = await sendCommand(
            client,
            eventBuffer,
            { 
                type: 'add_to_group', 
                group_id: groupId, 
                numbers: [phoneNumber],
                delay: 1
            },
            'automation_finished',
            60000
        );
        
        const report = response.data.report;
        
        // Check if addition failed due to permissions
        if (report.failed.length > 0) {
            const failedEntry = report.failed[0];
            const isPermissionError = 
                failedEntry.reason.includes('not authorized') ||
                failedEntry.reason.includes('Not authorized') ||
                failedEntry.reason.includes('forbidden') ||
                failedEntry.reason.includes('not an admin');
            
            if (isPermissionError) {
                printTestResult('Permission Error Handling', true, `- Correctly detected: ${failedEntry.reason}`);
            } else {
                printTestResult('Permission Error Handling', false, `- Unexpected error: ${failedEntry.reason}`);
            }
        } else {
            printWarning('Addition succeeded - group might allow non-admins to add members');
        }
    } catch (error) {
        // Error might be thrown before response
        if (error.message.includes('not authorized') || error.message.includes('forbidden')) {
            printTestResult('Permission Error Handling', true, `- Correctly detected: ${error.message}`);
        } else {
            printTestResult('Permission Error Handling', false, `- ${error.message}`);
        }
    }
}

/**
 * Print final test summary
 */
function printTestSummary() {
    print('\n' + '='.repeat(60), 'bright');
    print('TEST SUMMARY', 'bright');
    print('='.repeat(60), 'bright');
    
    print(`\nPassed: ${testResults.passed.length}`, 'green');
    testResults.passed.forEach(test => {
        print(`  ✓ ${test}`, 'green');
    });
    
    if (testResults.failed.length > 0) {
        print(`\nFailed: ${testResults.failed.length}`, 'red');
        testResults.failed.forEach(test => {
            print(`  ✗ ${test}`, 'red');
        });
    }
    
    if (testResults.warnings.length > 0) {
        print(`\nWarnings: ${testResults.warnings.length}`, 'yellow');
        testResults.warnings.forEach(warning => {
            print(`  ⚠ ${warning}`, 'yellow');
        });
    }
    
    const totalTests = testResults.passed.length + testResults.failed.length;
    const passRate = totalTests > 0 ? (testResults.passed.length / totalTests * 100).toFixed(1) : 0;
    
    print(`\nTotal Tests: ${totalTests}`, 'cyan');
    print(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
    print('='.repeat(60), 'bright');
}

/**
 * Main test execution
 */
async function runTests() {
    print('╔════════════════════════════════════════════════════════════╗', 'bright');
    print('║   Baileys Group Operations Test Suite                     ║', 'bright');
    print('╚════════════════════════════════════════════════════════════╝', 'bright');
    
    print('\nThis test suite will verify all group operations:', 'cyan');
    print('  1. Fetching all groups', 'cyan');
    print('  2. Extracting members from a group', 'cyan');
    print('  3. Adding single user to group', 'cyan');
    print('  4. Bulk add operation with delay', 'cyan');
    print('  5. Group permission error handling', 'cyan');
    
    print('\nPrerequisites:', 'yellow');
    print('  - WhatsApp must be authenticated (auth_info directory exists)', 'yellow');
    print('  - You must be a member of at least one group', 'yellow');
    print('  - You should be an admin of at least one group for full testing', 'yellow');
    
    const proceed = await waitForConfirmation('\nReady to start tests?');
    if (!proceed) {
        print('\nTests cancelled by user', 'red');
        rl.close();
        process.exit(0);
    }
    
    let client, eventBuffer;
    
    try {
        // Start WhatsApp client
        ({ client, eventBuffer } = await spawnWhatsAppClient());
        print('\n✓ WhatsApp client is ready', 'green');
        
        // Test 1: Fetch all groups
        const groups = await testFetchGroups(client, eventBuffer);
        if (!groups || groups.length === 0) {
            print('\n✗ No groups found. Cannot continue with tests.', 'red');
            client.kill();
            rl.close();
            return;
        }
        
        // Select a group for testing
        print('\nSelect a group for testing (you should be an admin):', 'bright');
        const groupIndex = await ask('Enter group number: ');
        const selectedGroup = groups[parseInt(groupIndex) - 1];
        
        if (!selectedGroup) {
            print('\n✗ Invalid group selection', 'red');
            client.kill();
            rl.close();
            return;
        }
        
        print(`\nSelected group: ${selectedGroup.name}`, 'green');
        print(`Group ID: ${selectedGroup.id}`, 'cyan');
        print(`You are ${selectedGroup.isAdmin ? 'an ADMIN' : 'NOT an admin'}`, selectedGroup.isAdmin ? 'green' : 'yellow');
        
        // Test 2: Extract members
        const members = await testExtractMembers(client, eventBuffer, selectedGroup.id);
        if (!members || members.length === 0) {
            print('\n✗ No members found. Cannot continue with tests.', 'red');
            client.kill();
            rl.close();
            return;
        }
        
        // Test 3 & 4: Add operations (only if admin)
        if (selectedGroup.isAdmin) {
            print('\nFor add operations, you need test phone numbers.', 'yellow');
            print('WARNING: These numbers will be added to the group!', 'red');
            
            const testAdd = await waitForConfirmation('Do you want to test add operations?');
            
            if (testAdd) {
                // Test 3: Single add
                const singleNumber = await ask('Enter a phone number to add (with country code, e.g., 1234567890): ');
                if (singleNumber) {
                    await testAddSingleUser(client, eventBuffer, selectedGroup.id, singleNumber);
                }
                
                // Test 4: Bulk add
                const bulkTest = await waitForConfirmation('Do you want to test bulk add?');
                if (bulkTest) {
                    const numbersInput = await ask('Enter phone numbers separated by commas: ');
                    const numbers = numbersInput.split(',').map(n => n.trim()).filter(n => n);
                    const delay = parseInt(await ask('Enter delay in seconds between additions: '));
                    
                    if (numbers.length > 0) {
                        await testBulkAdd(client, eventBuffer, selectedGroup.id, numbers, delay);
                    }
                }
            }
        } else {
            printWarning('You are not an admin of this group. Skipping add operation tests.');
            
            // Test 5: Permission errors
            await testGroupPermissionErrors(client, eventBuffer, selectedGroup.id, '1234567890');
        }
        
        // Clean up
        print('\nCleaning up...', 'cyan');
        client.kill();
        
    } catch (error) {
        print(`\n✗ Test execution failed: ${error.message}`, 'red');
        if (client) {
            client.kill();
        }
    } finally {
        // Print summary
        printTestSummary();
        rl.close();
    }
}

// Run tests
runTests().catch(error => {
    print(`\nFatal error: ${error.message}`, 'red');
    console.error(error);
    rl.close();
    process.exit(1);
});
