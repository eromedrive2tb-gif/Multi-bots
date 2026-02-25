#!/bin/bash

# Configuration
URL="http://localhost:5173/webhooks/telegram" # The correct route is /webhooks/telegram (no /api/ prefix)
# URL="https://multibotcrmdev.vitrine.top/webhooks/telegram" # Use this for production/remote tests
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="$SCRIPT_DIR/telegram-member-events.json"

# You MUST replace these with valid IDs from your local database
BOT_ID="1f77595b-4c50-4431-b236-e55ef4d283a9"
TENANT_ID="97121161-0aa0-48b7-804e-f0287735f5a7"

# Secret token configured for the bot webhook (if any, otherwise leave it or find it in DB)
SECRET_TOKEN="b9540801272e85796e39d196fc388901364ccfabb61e2c0b0594104b88e6a881"

# Usage
if [ -z "$1" ]; then
  echo "Usage: ./test-webhooks.sh [join|leave|join_forced|leave_forced]"
  exit 1
fi

ACTION=$1

# Basic validation (optional, as the bun command will fail if key doesn't exist)
if [ "$ACTION" != "join" ] && [ "$ACTION" != "leave" ] && [ "$ACTION" != "join_forced" ] && [ "$ACTION" != "leave_forced" ]; then
  echo "Invalid action. Use 'join', 'leave', 'join_forced' or 'leave_forced'."
  exit 1
fi

# Extract the payload for the specific action using bun (since jq is not available)
PAYLOAD=$(bun -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('$JSON_FILE', 'utf8')); console.log(JSON.stringify(data['$ACTION']));")

if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" == "null" ]; then
  echo "Failed to extract payload for action: $ACTION"
  exit 1
fi

echo "Sending $ACTION webhook to $URL/$BOT_ID"
echo "Tenant ID: $TENANT_ID"
echo "Payload: $PAYLOAD"

curl -X POST "$URL/$BOT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$PAYLOAD"

echo -e "\n\nWebhook sent. Check your local server logs for processing details."
