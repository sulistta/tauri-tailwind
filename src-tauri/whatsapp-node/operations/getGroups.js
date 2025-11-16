/**
 * Get all WhatsApp groups using Baileys
 * Fetches all group metadata and returns group information
 * Requirements: 4.1, 4.4, 9.1, 9.2, 9.3
 * 
 * @param {WASocket} sock - Baileys socket instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @returns {Promise<void>}
 */
async function getGroups(sock, sendToTauri) {
    try {
        // Fetch all group metadata using Baileys
        const groups = await sock.groupFetchAllParticipating();
        
        // Transform to expected format
        // Map group.subject to name, group.id to id
        const groupList = Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject,
            participantCount: group.participants.length,
            // Check admin status using participant.admin field
            isAdmin: group.participants.some(
                p => p.id === sock.user.id && (p.admin === 'admin' || p.admin === 'superadmin')
            )
        }));
        
        // Send results back to Tauri (maintain same event emission format)
        sendToTauri('groups_result', { groups: groupList });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to get groups',
            error: error.message
        });
    }
}

module.exports = getGroups;
