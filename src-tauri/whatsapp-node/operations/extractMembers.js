/**
 * Extract members from a specific WhatsApp group
 * Retrieves participant information including phone numbers, names, and admin status
 * 
 * @param {Client} client - WhatsApp client instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @param {string} groupId - The group ID to extract members from
 * @returns {Promise<void>}
 */
async function extractMembers(client, sendToTauri, groupId) {
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
        
        // Extract participant information
        // Handle cases where participant names are unavailable (set to null)
        const participants = chat.participants.map(participant => ({
            phone_number: participant.id.user,
            name: participant.pushname || null,
            is_admin: participant.isAdmin || false
        }));
        
        // Send results back to Tauri
        sendToTauri('members_result', { 
            group_id: groupId,
            participants 
        });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to extract members',
            group_id: groupId,
            error: error.message
        });
    }
}

module.exports = extractMembers;
