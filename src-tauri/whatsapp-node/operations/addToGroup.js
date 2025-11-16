/**
 * Add multiple users to a WhatsApp group using Baileys with configurable delay
 * Processes each phone number sequentially, tracking successes and failures
 * Sends progress updates to Tauri for real-time monitoring
 * Requirements: 4.3, 4.5, 9.1, 9.2, 9.3
 * 
 * @param {WASocket} sock - Baileys socket instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @param {string} groupId - The group ID to add users to
 * @param {string[]} numbers - Array of phone numbers to add
 * @param {number} delay - Delay in seconds between each addition
 * @returns {Promise<void>}
 */
async function addToGroup(sock, sendToTauri, groupId, numbers, delay) {
    try {
        // Initialize results tracking
        const results = {
            successful: [],
            failed: [],
            total_processed: 0
        };
        
        // Process each phone number sequentially
        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i];
            
            try {
                // Format number for WhatsApp (remove special characters, keep only digits)
                const formattedNumber = number.replace(/[^0-9]/g, '');
                // Format to JID format for Baileys
                const jid = `${formattedNumber}@s.whatsapp.net`;
                
                // Add participant to group using Baileys
                const response = await sock.groupParticipantsUpdate(
                    groupId,
                    [jid],
                    'add'
                );
                
                // Parse response status codes (200 for success)
                if (response[0]?.status === '200') {
                    // Track successful addition
                    results.successful.push(number);
                    
                    // Send progress update to Tauri
                    sendToTauri('automation_progress', {
                        current: i + 1,
                        total: numbers.length,
                        status: `Added ${number}`
                    });
                } else {
                    // Handle non-success status codes
                    const statusCode = response[0]?.status || 'Unknown';
                    const reason = getErrorReason(statusCode);
                    
                    // Track failed addition with reason
                    results.failed.push({
                        phone_number: number,
                        reason: reason
                    });
                    
                    // Send progress update with failure info
                    sendToTauri('automation_progress', {
                        current: i + 1,
                        total: numbers.length,
                        status: `Failed to add ${number}: ${reason}`
                    });
                }
            } catch (error) {
                // Handle group permission errors and other exceptions
                const errorMessage = error.message || 'Unknown error';
                let reason = errorMessage;
                
                // Check for specific error types
                if (errorMessage.includes('not-authorized') || errorMessage.includes('forbidden')) {
                    reason = 'Not authorized to add members (not an admin)';
                } else if (errorMessage.includes('not a participant')) {
                    reason = 'You are not a participant of this group';
                } else if (errorMessage.includes('privacy')) {
                    reason = 'User privacy settings prevent adding';
                }
                
                // Track failed addition with reason
                results.failed.push({
                    phone_number: number,
                    reason: reason
                });
                
                // Send progress update with failure info
                sendToTauri('automation_progress', {
                    current: i + 1,
                    total: numbers.length,
                    status: `Failed to add ${number}: ${reason}`
                });
            }
            
            // Increment total processed count
            results.total_processed++;
            
            // Apply delay between additions (except for the last one)
            if (i < numbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
        }
        
        // Send final report to Tauri (maintain same event emission format)
        sendToTauri('automation_finished', { report: results });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to add users to group',
            group_id: groupId,
            error: error.message
        });
    }
}

/**
 * Get human-readable error reason from status code
 * @param {string} statusCode - Status code from Baileys response
 * @returns {string} Human-readable error reason
 */
function getErrorReason(statusCode) {
    const errorReasons = {
        '403': 'Not authorized (not an admin)',
        '404': 'User not found',
        '408': 'Request timeout',
        '409': 'User already in group',
        '500': 'Internal server error',
        '503': 'Service unavailable'
    };
    
    return errorReasons[statusCode] || `Error (status: ${statusCode})`;
}

module.exports = addToGroup;
