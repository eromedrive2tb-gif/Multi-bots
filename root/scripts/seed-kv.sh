#!/bin/bash

# Seed KV with example blueprints
# Usage: ./seed-kv.sh [local|production]

ENV=$1
if [ "$ENV" == "production" ]; then
  FLAGS=""
else
  FLAGS="--local"
fi

echo "🌱 Seeding BLUEPRINTS_KV ($ENV)..."

# Go to project root to find wrangler.jsonc
cd "$(dirname "$0")/../.."

# Start Flow
npx wrangler kv key put --binding BLUEPRINTS_KV "tenant:global:flow:start-flow" --path root/apps/dashboard/src/blueprints/examples/start-flow.json $FLAGS
npx wrangler kv key put --binding BLUEPRINTS_KV "tenant:global:trigger:/start" "start-flow" $FLAGS

# Health Flow
npx wrangler kv key put --binding BLUEPRINTS_KV "tenant:global:flow:health-flow" --path root/apps/dashboard/src/blueprints/examples/health-flow.json $FLAGS
npx wrangler kv key put --binding BLUEPRINTS_KV "tenant:global:trigger:/health" "health-flow" $FLAGS

echo "✅ Done!"
