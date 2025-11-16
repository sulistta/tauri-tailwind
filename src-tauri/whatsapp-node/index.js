const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

// Import operation handlers
const getGroups = require('./operations/getGroups');
const extractMembers = require('./operations/extractMembers');
const addToGroup = require('./operations/addToGroup');

/**
 * Communication protocol with Tauri backend
 * Sends JSON messages via stdout for Tauri to parse
 */
function sendToTauri(event, data) {
    const message = JSON.stringify({ event, data });
    console.log(message);
}

/**
 * Initialize WhatsApp client with LocalAuth strategy
 * Session data is stored in ./session directory for persistence
 */
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, 'session')
    }),
    puppeteer: {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

/**
 * QR Code Event Handler
 * Generates QR code and sends base64 encoded image to Tauri
 */
client.on('qr', async (qr) => {
    try {
        const qrBase64 = await qrcode.toDataURL(qr);
        sendToTauri('whatsapp_qr', { qr: qrBase64 });
    } catch (error) {
        sendToTauri('whatsapp_error', {
            message: 'Failed to generate QR code',
            error: error.message
        });
    }
});

/**
 * Ready Event Handler
 * Fired when WhatsApp client is authenticated and ready
 */
client.on('ready', () => {
    const phoneNumber = client.info?.wid?.user || 'unknown';
    sendToTauri('whatsapp_ready', {
        phoneNumber: phoneNumber,
        timestamp: new Date().toISOString()
    });
});

/**
 * Disconnected Event Handler
 * Fired when WhatsApp client loses connection
 */
client.on('disconnected', (reason) => {
    sendToTauri('whatsapp_disconnected', {
        reason: reason || 'Unknown reason',
        timestamp: new Date().toISOString()
    });
});

/**
 * Message Event Handler
 * Fired when a new message is received
 */
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        sendToTauri('whatsapp_message', {
            id: message.id._serialized,
            from: message.from,
            to: message.to,
            body: message.body,
            timestamp: message.timestamp,
            isGroup: chat.isGroup,
            chatName: chat.name,
            hasMedia: message.hasMedia
        });
    } catch (error) {
        sendToTauri('whatsapp_error', {
            message: 'Failed to process message',
            error: error.message
        });
    }
});

/**
 * Authentication Failure Event Handler
 */
client.on('auth_failure', (message) => {
    sendToTauri('whatsapp_error', {
        message: 'Authentication failed',
        error: message
    });
});

/**
 * Loading Screen Event Handler
 * Provides progress updates during initialization
 */
client.on('loading_screen', (percent, message) => {
    sendToTauri('whatsapp_loading', {
        percent: percent,
        message: message
    });
});

/**
 * Command Handler
 * Listens for commands from Tauri via stdin
 * Uses readline to handle line-by-line input properly
 */
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', async (line) => {
    try {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
            return;
        }

        const command = JSON.parse(trimmedLine);

        switch (command.type) {
            case 'get_groups':
                await getGroups(client, sendToTauri);
                break;

            case 'extract_members':
                await extractMembers(client, sendToTauri, command.group_id);
                break;

            case 'add_to_group':
                await addToGroup(
                    client,
                    sendToTauri,
                    command.group_id,
                    command.numbers,
                    command.delay
                );
                break;

            case 'send_message':
                await handleSendMessage(command.to, command.message);
                break;

            case 'get_status':
                await handleGetStatus();
                break;

            default:
                sendToTauri('command_error', {
                    message: `Unknown command type: ${command.type}`
                });
        }
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to parse command',
            error: error.message
        });
    }
});



/**
 * Send a message to a contact or group
 */
async function handleSendMessage(to, message) {
    try {
        await client.sendMessage(to, message);
        sendToTauri('message_sent', {
            to: to,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to send message',
            error: error.message
        });
    }
}

/**
 * Get current client status
 */
async function handleGetStatus() {
    try {
        const state = await client.getState();
        sendToTauri('status_result', {
            state: state,
            is_connected: client.info !== null,
            phone_number: client.info?.wid?.user || null
        });
    } catch (error) {
        sendToTauri('command_error', {
            message: 'Failed to get status',
            error: error.message
        });
    }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
    try {
        await client.destroy();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await client.destroy();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
});

/**
 * Initialize the WhatsApp client
 */
sendToTauri('client_initializing', {
    timestamp: new Date().toISOString()
});

client.initialize().catch(error => {
    sendToTauri('whatsapp_error', {
        message: 'Failed to initialize client',
        error: error.message
    });
    process.exit(1);
});
