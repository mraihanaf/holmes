#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET=""
if [[ "${1:-}" == "--prod" ]]; then
  TARGET="--prod"
  echo "Seeding the PRODUCTION Convex deployment"
elif [[ -n "${1:-}" ]]; then
  echo "Usage: bash scripts/seed_convex.sh [--prod]" >&2
  exit 2
fi

# The global city board ships all 7,349 cities and a small curated cell seed.
# Every other cell is fetched lazily by the stats:ensureCity action.
npx convex import $TARGET --table cities --replace -y convex/data/cities.jsonl
npx convex import $TARGET --table variables --replace -y convex/data/variables.jsonl
npx convex import $TARGET --table cells --replace -y convex/data/seed-cells.jsonl
npx convex import $TARGET --table cellBoards --replace -y convex/data/seed-cell-boards.jsonl
npx convex import $TARGET --table cases --replace -y convex/data/cases.jsonl
npx convex import $TARGET --table fires --replace -y convex/data/fires.jsonl

# Imports bypass mutations, so refresh the small health counters explicitly.
npx convex run $TARGET seed:refreshCounters

echo "Convex seed complete: cities, variables, curated cells, cases, fires"
