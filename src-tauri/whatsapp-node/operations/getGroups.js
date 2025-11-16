/**
 * Get all WhatsApp groups
 * Fetches all chats, filters for groups only, and returns group information
 * 
 * @param {Client} client - WhatsApp client instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @returns {Promise<void>}
 */
async function getGroups(client, sendToTauri) {
    try {
        // Fetch all chats from WhatsApp
        const chats = await client.getChats();
        
        // Filter for group chats only (exclude individual chats)
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                name: group.name,
                participantCount: group.participants?.length || 0,
                isAdmin: group.participants?.some(
                    p => p.id._serialized === client.info.wid._serialized && p.isAdmin
                ) || false
            }));
        
        // Send results back to Tauri
        sendToTauri('groups_result', { groups });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to get groups',
            error: error.message
        });
    }
}

module.exports = getGroups;
