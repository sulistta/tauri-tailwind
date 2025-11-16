/**
 * Extract members from a specific WhatsApp group using Baileys
 * Retrieves participant information including phone numbers, names, and admin status
 * Requirements: 4.2, 4.4, 9.1, 9.2, 9.3
 * 
 * @param {WASocket} sock - Baileys socket instance
 * @param {Function} sendToTauri - Function to send messages to Tauri backend
 * @param {string} groupId - The group ID to extract members from
 * @returns {Promise<void>}
 */
async function extractMembers(sock, sendToTauri, groupId) {
    try {
        // Fetch group metadata using Baileys
        const groupMetadata = await sock.groupMetadata(groupId);
        
        // Transform participants to expected format
        // Parse phone numbers from JID format (split by '@')
        const participants = groupMetadata.participants.map(participant => ({
            phoneNumber: participant.id.split('@')[0],
            name: participant.notify || null,
            isAdmin: participant.admin === 'admin' || participant.admin === 'superadmin'
        }));
        
        // Send results back to Tauri (maintain same event emission format)
        sendToTauri('members_result', { 
            group_id: groupId,
            members: participants 
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
