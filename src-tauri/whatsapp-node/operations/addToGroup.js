/**
 * Add multiple users to a WhatsApp group with configurable delay
 * Processes each phone number sequentially, tracking successes and failures
 * Sends progress updates to Tauri for real-time monitoring
 * 
 * @param {Client} client - WhatsApp client instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @param {string} groupId - The group ID to add users to
 * @param {string[]} numbers - Array of phone numbers to add
 * @param {number} delay - Delay in seconds between each addition
 * @returns {Promise<void>}
 */
async function addToGroup(client, sendToTauri, groupId, numbers, delay) {
    try {
        // Get the specific chat by ID
        const chat = await client.getChatById(groupId);
        
        // Verify it's a group chat
        if (!chat.isGroup) {
            sendToTauri('command_error', {
                message: 'Chat is not a group',
                group_id: groupId
            });
            return;
        }
        
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
                const numberId = `${formattedNumber}@c.us`;
                
                // Attempt to add participant to group
                await chat.addParticipants([numberId]);
                
                // Track successful addition
                results.successful.push(number);
                
                // Send progress update to Tauri
                sendToTauri('automation_progress', {
                    current: i + 1,
                    total: numbers.length,
                    status: `Added ${number}`
                });
            } catch (error) {
                // Track failed addition with reason
                results.failed.push({
                    phone_number: number,
                    reason: error.message
                });
                
                // Send progress update with failure info
                sendToTauri('automation_progress', {
                    current: i + 1,
                    total: numbers.length,
                    status: `Failed to add ${number}: ${error.message}`
                });
            }
            
            // Increment total processed count
            results.total_processed++;
            
            // Apply delay between additions (except for the last one)
            if (i < numbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
        }
        
        // Send final report to Tauri
        sendToTauri('automation_finished', { report: results });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to add users to group',
            group_id: groupId,
            error: error.message
        });
    }
}

module.exports = addToGroup;
