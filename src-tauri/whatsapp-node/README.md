# WhatsApp Node.js Client

This Node.js application manages the WhatsApp Web connection using whatsapp-web.js library. It communicates with the Tauri backend via JSON messages over stdio.

## Installation

```bash
npm install
```

## Communication Protocol

### Events Sent to Tauri (via stdout)

All messages are JSON formatted:

```json
{
  "event": "event_name",
  "data": { /* event-specific data */ }
}
```

#### Event Types

- **whatsapp_qr**: QR code for authentication
  ```json
  { "event": "whatsapp_qr", "data": { "qr_base64": "data:image/png;base64,..." } }
  ```

- **whatsapp_ready**: Client is authenticated and ready
  ```json
  { "event": "whatsapp_ready", "data": { "phone_number": "1234567890", "timestamp": "..." } }
  ```

- **whatsapp_disconnected**: Client disconnected
  ```json
  { "event": "whatsapp_disconnected", "data": { "reason": "...", "timestamp": "..." } }
  ```

- **whatsapp_message**: New message received
  ```json
  { 
    "event": "whatsapp_message", 
    "data": { 
      "id": "...",
      "from": "...",
      "to": "...",
      "body": "...",
      "timestamp": 123456789,
      "isGroup": false,
      "chatName": "...",
      "hasMedia": false
    } 
  }
  ```

- **automation_progress**: Progress update during bulk operations
  ```json
  { "event": "automation_progress", "data": { "current": 5, "total": 10, "status": "..." } }
  ```

- **automation_finished**: Bulk operation completed
  ```json
  { 
    "event": "automation_finished", 
    "data": { 
      "report": {
        "successful": ["123", "456"],
        "failed": [{ "phone_number": "789", "reason": "..." }],
        "total_processed": 3
      }
    } 
  }
  ```

### Commands Received from Tauri (via stdin)

Commands are JSON formatted:

```json
{
  "type": "command_type",
  /* command-specific parameters */
}
```

#### Command Types

- **get_groups**: Retrieve all WhatsApp groups
  ```json
  { "type": "get_groups" }
  ```
  Response: `groups_result` event

- **extract_members**: Extract members from a group
  ```json
  { "type": "extract_members", "group_id": "..." }
  ```
  Response: `members_result` event

- **add_to_group**: Add users to a group
  ```json
  { 
    "type": "add_to_group", 
    "group_id": "...",
    "numbers": ["123", "456"],
    "delay": 5
  }
  ```
  Response: `automation_progress` events followed by `automation_finished`

- **send_message**: Send a message
  ```json
  { "type": "send_message", "to": "...", "message": "..." }
  ```
  Response: `message_sent` event

- **get_status**: Get current client status
  ```json
  { "type": "get_status" }
  ```
  Response: `status_result` event

## Session Persistence

Session data is stored in the `./session` directory using LocalAuth strategy. This allows the client to reconnect without requiring QR code scanning on subsequent runs.

## Error Handling

Errors are sent as events:

```json
{
  "event": "whatsapp_error",
  "data": {
    "message": "Error description",
    "error": "Detailed error message"
  }
}
```

or

```json
{
  "event": "command_error",
  "data": {
    "message": "Command failed",
    "error": "Detailed error message"
  }
}
```
