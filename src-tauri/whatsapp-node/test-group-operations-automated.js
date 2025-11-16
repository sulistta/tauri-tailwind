/**
 * Automated Test Script for Baileys Group Operations
 * 
 * This script performs automated validation of group operations without requiring
 * user interaction. It validates the structure and behavior of the operations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Usage: node test-group-operations-automated.js
 */

const getGroups = require('./operations/getGroups');
const extractMembers = require('./operations/extractMembers');
const addToGroup = require('./operations/addToGroup');

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Mock socket for testing
const createMockSocket = () => {
    return {
        user: {
            id: '1234567890:1@s.whatsapp.net'
        },
        groupFetchAllParticipating: async () => {
            // Mock response with sample groups
            return {
                '120363123456789012@g.us': {
                    id: '120363123456789012@g.us',
                    subject: 'Test Group 1',
                    participants: [
                        { id: '1234567890:1@s.whatsapp.net', admin: 'admin' },
                        { id: '9876543210@s.whatsapp.net', admin: null, notify: 'John Doe' },
                        { id: '5555555555@s.whatsapp.net', admin: null, notify: 'Jane Smith' }
                    ]
                },
                '120363987654321098@g.us': {
                    id: '120363987654321098@g.us',
                    subject: 'Test Group 2',
                    participants: [
                        { id: '1234567890:1@s.whatsapp.net', admin: null },
                        { id: '1111111111@s.whatsapp.net', admin: 'superadmin', notify: 'Admin User' }
                    ]
                }
            };
        },
        groupMetadata: async (groupId) => {
            // Mock response with sample group metadata
            return {
                id: groupId,
                subject: 'Test Group',
                participants: [
                    { id: '1234567890@s.whatsapp.net', admin: 'admin', notify: 'Admin User' },
                    { id: '9876543210@s.whatsapp.net', admin: null, notify: 'John Doe' },
                    { id: '5555555555@s.whatsapp.net', admin: null, notify: 'Jane Smith' },
                    { id: '7777777777@s.whatsapp.net', admin: null, notify: null }
                ]
            };
        },
        groupParticipantsUpdate: async (groupId, jids, action) => {
            // Mock response for add operation
            return jids.map(jid => {
                // Simulate success for most, failure for specific test numbers
                if (jid === '9999999999@s.whatsapp.net') {
                    return { status: '403', jid }; // Permission error
                } else if (jid === '8888888888@s.whatsapp.net') {
                    return { status: '404', jid }; // Not found
                } else {
                    return { status: '200', jid }; // Success
                }
            });
        }
    };
};

// Mock sendToTauri function
const createMockSendToTauri = () => {
    const events = [];
    return {
        send: (event, data) => {
            events.push({ event, data, timestamp: Date.now() });
        },
        getEvents: () => events,
        clear: () => { events.length = 0; }
    };
};

// Test utilities
function assert(condition, testName, message) {
    if (condition) {
        console.log(`✓ ${testName}: ${message}`);
        results.passed++;
        results.tests.push({ name: testName, passed: true, message });
    } else {
        console.error(`✗ ${testName}: ${message}`);
        results.failed++;
        results.tests.push({ name: testName, passed: false, message });
    }
}

function assertEquals(actual, expected, testName, message) {
    const passed = actual === expected;
    assert(passed, testName, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertArrayLength(array, expectedLength, testName, message) {
    assertEquals(array.length, expectedLength, testName, message);
}

function assertObjectHasKeys(obj, keys, testName, message) {
    const hasAllKeys = keys.every(key => key in obj);
    assert(hasAllKeys, testName, `${message} (keys: ${keys.join(', ')})`);
}

// Test 1: getGroups operation
async function testGetGroups() {
    console.log('\n=== Test 1: getGroups Operation ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    
    try {
        await getGroups(mockSocket, mockSender.send);
        
        const events = mockSender.getEvents();
        
        // Verify event was emitted
        assert(events.length > 0, 'getGroups', 'Should emit at least one event');
        
        // Verify correct event type
        const groupsEvent = events.find(e => e.event === 'groups_result');
        assert(groupsEvent !== undefined, 'getGroups', 'Should emit groups_result event');
        
        if (groupsEvent) {
            // Verify data structure
            assert(groupsEvent.data.groups !== undefined, 'getGroups', 'Should have groups array in data');
            assert(Array.isArray(groupsEvent.data.groups), 'getGroups', 'Groups should be an array');
            
            const groups = groupsEvent.data.groups;
            assertArrayLength(groups, 2, 'getGroups', 'Should return 2 groups');
            
            // Verify group format
            if (groups.length > 0) {
                const group = groups[0];
                assertObjectHasKeys(group, ['id', 'name', 'participantCount', 'isAdmin'], 'getGroups', 'Group should have required fields');
                
                // Verify field types
                assert(typeof group.id === 'string', 'getGroups', 'Group id should be string');
                assert(typeof group.name === 'string', 'getGroups', 'Group name should be string');
                assert(typeof group.participantCount === 'number', 'getGroups', 'Group participantCount should be number');
                assert(typeof group.isAdmin === 'boolean', 'getGroups', 'Group isAdmin should be boolean');
                
                // Verify admin detection
                assert(group.isAdmin === true, 'getGroups', 'Should correctly detect admin status');
            }
        }
    } catch (error) {
        assert(false, 'getGroups', `Should not throw error: ${error.message}`);
    }
}

// Test 2: extractMembers operation
async function testExtractMembers() {
    console.log('\n=== Test 2: extractMembers Operation ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    const testGroupId = '120363123456789012@g.us';
    
    try {
        await extractMembers(mockSocket, mockSender.send, testGroupId);
        
        const events = mockSender.getEvents();
        
        // Verify event was emitted
        assert(events.length > 0, 'extractMembers', 'Should emit at least one event');
        
        // Verify correct event type
        const membersEvent = events.find(e => e.event === 'members_result');
        assert(membersEvent !== undefined, 'extractMembers', 'Should emit members_result event');
        
        if (membersEvent) {
            // Verify data structure
            assert(membersEvent.data.members !== undefined, 'extractMembers', 'Should have members array in data');
            assert(Array.isArray(membersEvent.data.members), 'extractMembers', 'Members should be an array');
            assertEquals(membersEvent.data.group_id, testGroupId, 'extractMembers', 'Should include group_id in response');
            
            const members = membersEvent.data.members;
            assertArrayLength(members, 4, 'extractMembers', 'Should return 4 members');
            
            // Verify member format
            if (members.length > 0) {
                const member = members[0];
                assertObjectHasKeys(member, ['phoneNumber', 'name', 'isAdmin'], 'extractMembers', 'Member should have required fields');
                
                // Verify field types
                assert(typeof member.phoneNumber === 'string', 'extractMembers', 'Member phoneNumber should be string');
                assert(typeof member.isAdmin === 'boolean', 'extractMembers', 'Member isAdmin should be boolean');
                
                // Verify phone number parsing (should not contain @)
                assert(!member.phoneNumber.includes('@'), 'extractMembers', 'Phone number should not contain @ symbol');
                assert(!member.phoneNumber.includes(':'), 'extractMembers', 'Phone number should not contain : symbol');
                
                // Verify admin detection
                const adminMember = members.find(m => m.isAdmin);
                assert(adminMember !== undefined, 'extractMembers', 'Should correctly detect admin members');
            }
        }
    } catch (error) {
        assert(false, 'extractMembers', `Should not throw error: ${error.message}`);
    }
}

// Test 3: addToGroup operation - single user
async function testAddToGroupSingle() {
    console.log('\n=== Test 3: addToGroup Operation - Single User ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    const testGroupId = '120363123456789012@g.us';
    const testNumber = '1234567890';
    const delay = 1;
    
    try {
        await addToGroup(mockSocket, mockSender.send, testGroupId, [testNumber], delay);
        
        const events = mockSender.getEvents();
        
        // Verify events were emitted
        assert(events.length > 0, 'addToGroup-single', 'Should emit at least one event');
        
        // Verify progress event
        const progressEvent = events.find(e => e.event === 'automation_progress');
        assert(progressEvent !== undefined, 'addToGroup-single', 'Should emit automation_progress event');
        
        if (progressEvent) {
            assertObjectHasKeys(progressEvent.data, ['current', 'total', 'status'], 'addToGroup-single', 'Progress event should have required fields');
            assertEquals(progressEvent.data.current, 1, 'addToGroup-single', 'Progress current should be 1');
            assertEquals(progressEvent.data.total, 1, 'addToGroup-single', 'Progress total should be 1');
        }
        
        // Verify finished event
        const finishedEvent = events.find(e => e.event === 'automation_finished');
        assert(finishedEvent !== undefined, 'addToGroup-single', 'Should emit automation_finished event');
        
        if (finishedEvent) {
            const report = finishedEvent.data.report;
            assertObjectHasKeys(report, ['successful', 'failed', 'total_processed'], 'addToGroup-single', 'Report should have required fields');
            
            assert(Array.isArray(report.successful), 'addToGroup-single', 'Successful should be an array');
            assert(Array.isArray(report.failed), 'addToGroup-single', 'Failed should be an array');
            assertEquals(report.total_processed, 1, 'addToGroup-single', 'Should process 1 user');
            
            // Verify successful addition
            assert(report.successful.includes(testNumber), 'addToGroup-single', 'Should successfully add the user');
        }
    } catch (error) {
        assert(false, 'addToGroup-single', `Should not throw error: ${error.message}`);
    }
}

// Test 4: addToGroup operation - bulk with delay
async function testAddToGroupBulk() {
    console.log('\n=== Test 4: addToGroup Operation - Bulk with Delay ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    const testGroupId = '120363123456789012@g.us';
    const testNumbers = ['1111111111', '2222222222', '3333333333'];
    const delay = 1;
    
    const startTime = Date.now();
    
    try {
        await addToGroup(mockSocket, mockSender.send, testGroupId, testNumbers, delay);
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        const events = mockSender.getEvents();
        
        // Verify multiple progress events
        const progressEvents = events.filter(e => e.event === 'automation_progress');
        assertArrayLength(progressEvents, 3, 'addToGroup-bulk', 'Should emit 3 progress events');
        
        // Verify progress event sequence
        if (progressEvents.length === 3) {
            assertEquals(progressEvents[0].data.current, 1, 'addToGroup-bulk', 'First progress should be 1/3');
            assertEquals(progressEvents[1].data.current, 2, 'addToGroup-bulk', 'Second progress should be 2/3');
            assertEquals(progressEvents[2].data.current, 3, 'addToGroup-bulk', 'Third progress should be 3/3');
        }
        
        // Verify delay was applied (should take at least 2 seconds for 3 users with 1s delay)
        const expectedMinDuration = (testNumbers.length - 1) * delay;
        assert(duration >= expectedMinDuration, 'addToGroup-bulk', `Should respect delay (took ${duration.toFixed(1)}s, expected ≥${expectedMinDuration}s)`);
        
        // Verify finished event
        const finishedEvent = events.find(e => e.event === 'automation_finished');
        assert(finishedEvent !== undefined, 'addToGroup-bulk', 'Should emit automation_finished event');
        
        if (finishedEvent) {
            const report = finishedEvent.data.report;
            assertEquals(report.total_processed, 3, 'addToGroup-bulk', 'Should process 3 users');
            assertEquals(report.successful.length, 3, 'addToGroup-bulk', 'Should successfully add 3 users');
        }
    } catch (error) {
        assert(false, 'addToGroup-bulk', `Should not throw error: ${error.message}`);
    }
}

// Test 5: addToGroup operation - permission errors
async function testAddToGroupPermissionError() {
    console.log('\n=== Test 5: addToGroup Operation - Permission Errors ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    const testGroupId = '120363123456789012@g.us';
    const testNumbers = ['9999999999', '8888888888']; // These will fail in mock
    const delay = 1;
    
    try {
        await addToGroup(mockSocket, mockSender.send, testGroupId, testNumbers, delay);
        
        const events = mockSender.getEvents();
        
        // Verify finished event
        const finishedEvent = events.find(e => e.event === 'automation_finished');
        assert(finishedEvent !== undefined, 'addToGroup-errors', 'Should emit automation_finished event');
        
        if (finishedEvent) {
            const report = finishedEvent.data.report;
            
            // Verify failures were tracked
            assert(report.failed.length > 0, 'addToGroup-errors', 'Should track failed additions');
            assertArrayLength(report.failed, 2, 'addToGroup-errors', 'Should have 2 failed additions');
            
            // Verify failure details
            if (report.failed.length > 0) {
                const failure = report.failed[0];
                assertObjectHasKeys(failure, ['phone_number', 'reason'], 'addToGroup-errors', 'Failure should have phone_number and reason');
                
                // Verify error reasons are meaningful
                assert(failure.reason.length > 0, 'addToGroup-errors', 'Failure reason should not be empty');
                assert(failure.reason !== 'Unknown error', 'addToGroup-errors', 'Failure reason should be specific');
            }
        }
    } catch (error) {
        assert(false, 'addToGroup-errors', `Should not throw error: ${error.message}`);
    }
}

// Test 6: Phone number formatting
async function testPhoneNumberFormatting() {
    console.log('\n=== Test 6: Phone Number Formatting ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    const testGroupId = '120363123456789012@g.us';
    
    // Test various phone number formats
    const testNumbers = [
        '+1-234-567-8900',  // With country code and dashes
        '(555) 123-4567',   // With parentheses and spaces
        '555.123.4567',     // With dots
        '5551234567'        // Plain digits
    ];
    const delay = 0;
    
    try {
        await addToGroup(mockSocket, mockSender.send, testGroupId, testNumbers, delay);
        
        const events = mockSender.getEvents();
        const finishedEvent = events.find(e => e.event === 'automation_finished');
        
        if (finishedEvent) {
            const report = finishedEvent.data.report;
            
            // All should succeed (mock accepts all formatted numbers)
            assertEquals(report.successful.length, 4, 'phoneFormatting', 'Should handle all phone number formats');
            assertEquals(report.failed.length, 0, 'phoneFormatting', 'Should not fail on formatting');
        }
    } catch (error) {
        assert(false, 'phoneFormatting', `Should not throw error: ${error.message}`);
    }
}

// Test 7: Event emission format
async function testEventEmissionFormat() {
    console.log('\n=== Test 7: Event Emission Format ===');
    
    const mockSocket = createMockSocket();
    const mockSender = createMockSendToTauri();
    
    // Test all operations emit events in correct format
    try {
        // Test getGroups
        await getGroups(mockSocket, mockSender.send);
        let events = mockSender.getEvents();
        let lastEvent = events[events.length - 1];
        
        assert(lastEvent.event === 'groups_result', 'eventFormat', 'getGroups should emit groups_result');
        assert(lastEvent.data !== undefined, 'eventFormat', 'Event should have data property');
        
        mockSender.clear();
        
        // Test extractMembers
        await extractMembers(mockSocket, mockSender.send, '120363123456789012@g.us');
        events = mockSender.getEvents();
        lastEvent = events[events.length - 1];
        
        assert(lastEvent.event === 'members_result', 'eventFormat', 'extractMembers should emit members_result');
        assert(lastEvent.data !== undefined, 'eventFormat', 'Event should have data property');
        
        mockSender.clear();
        
        // Test addToGroup
        await addToGroup(mockSocket, mockSender.send, '120363123456789012@g.us', ['1234567890'], 0);
        events = mockSender.getEvents();
        
        const hasProgressEvent = events.some(e => e.event === 'automation_progress');
        const hasFinishedEvent = events.some(e => e.event === 'automation_finished');
        
        assert(hasProgressEvent, 'eventFormat', 'addToGroup should emit automation_progress');
        assert(hasFinishedEvent, 'eventFormat', 'addToGroup should emit automation_finished');
        
    } catch (error) {
        assert(false, 'eventFormat', `Should not throw error: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Baileys Group Operations Automated Test Suite           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    try {
        await testGetGroups();
        await testExtractMembers();
        await testAddToGroupSingle();
        await testAddToGroupBulk();
        await testAddToGroupPermissionError();
        await testPhoneNumberFormatting();
        await testEventEmissionFormat();
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${results.passed + results.failed}`);
        console.log(`Passed: ${results.passed} ✓`);
        console.log(`Failed: ${results.failed} ✗`);
        
        const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
        console.log(`Pass Rate: ${passRate}%`);
        console.log('='.repeat(60));
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n✗ Test suite failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runAllTests();
