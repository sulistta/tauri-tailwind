# QR Code Display Fix

## Problem

The app was stuck in "initializing" state and never displayed the QR code, even though the logs showed "QR code generated".

## Root Cause

Field name mismatch in the event data:

1. **Node.js client** (`src-tauri/whatsapp-node/index.js`) was sending:

    ```javascript
    sendToTauri('whatsapp_qr', { qr_base64: qrBase64 })
    ```

2. **Connection Manager** (`src-tauri/src/connection/manager.rs`) was expecting:
    ```rust
    if let Some(qr_code) = data.get("qr").and_then(|q| q.as_str()) {
    ```

The field was named `qr_base64` but the Rust code was looking for `qr`, so the QR code was never extracted and forwarded to the frontend.

## Solution

Changed the Node.js client to send the correct field name:

```javascript
sendToTauri('whatsapp_qr', { qr: qrBase64 })
```

## Event Flow

1. Node.js WhatsApp client generates QR code → sends `whatsapp_qr` event with `{ qr: "data:image/png;base64,..." }`
2. Rust WhatsApp client receives event → emits to Tauri event system
3. Main.rs event listener → forwards to ConnectionManager.handle_state_event()
4. ConnectionManager extracts `qr` field → stores in metadata → emits `whatsapp_state_changed` event
5. Frontend receives `whatsapp_state_changed` with `qr_code` field → displays QR code

## Testing

To test with a fresh session:

1. Stop the app completely
2. Delete `src-tauri/whatsapp-node/session` directory
3. Run `bun tauri dev`
4. QR code should now appear immediately

## Additional Issue Found

After fixing the QR code, the app was stuck in an infinite recovery loop after successful connection. This was caused by another field name mismatch:

- **Node.js client** was sending: `phone_number` (snake_case)
- **Connection Manager** was expecting: `phoneNumber` (camelCase)

This prevented the frontend from receiving the "connected" state, so the recovery mechanism kept running.

## Files Changed

- `src-tauri/whatsapp-node/index.js` - Fixed two field names:
    - `qr_base64` → `qr`
    - `phone_number` → `phoneNumber`
