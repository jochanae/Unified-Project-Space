#!/bin/bash

# CoinsBloom E2E Test Runner - Runs tests in smaller batches to avoid timeouts
# Usage: ./scripts/run-tests.sh [batch_number|all]

set -e

PROJECT="chromium"
WORKERS=1
TIMEOUT_PER_FILE=120

echo "================================================"
echo "CoinsBloom E2E Test Runner"
echo "================================================"

run_batch() {
    local batch_name=$1
    shift
    local files=("$@")
    
    echo ""
    echo "Running batch: $batch_name"
    echo "Files: ${files[*]}"
    echo "------------------------------------------------"
    
    for file in "${files[@]}"; do
        echo "Testing: $file"
        timeout $TIMEOUT_PER_FILE npx playwright test "$file" --project=$PROJECT --workers=$WORKERS --reporter=list || true
    done
}

# Define test batches
BATCH1=("e2e/landing.spec.ts" "e2e/auth.spec.ts")
BATCH2=("e2e/dashboard.spec.ts" "e2e/goals.spec.ts")
BATCH3=("e2e/budgets.spec.ts" "e2e/bills.spec.ts")
BATCH4=("e2e/accounts.spec.ts" "e2e/transactions.spec.ts")
BATCH5=("e2e/debts.spec.ts" "e2e/credit-score.spec.ts")
BATCH6=("e2e/vision-board.spec.ts" "e2e/reports.spec.ts")
BATCH7=("e2e/settings.spec.ts" "e2e/kids.spec.ts")
BATCH8=("e2e/accessibility.spec.ts" "e2e/navigation.spec.ts")

case "${1:-all}" in
    1) run_batch "Landing & Auth" "${BATCH1[@]}" ;;
    2) run_batch "Dashboard & Goals" "${BATCH2[@]}" ;;
    3) run_batch "Budgets & Bills" "${BATCH3[@]}" ;;
    4) run_batch "Accounts & Transactions" "${BATCH4[@]}" ;;
    5) run_batch "Debts & Credit" "${BATCH5[@]}" ;;
    6) run_batch "Vision & Reports" "${BATCH6[@]}" ;;
    7) run_batch "Settings & Kids" "${BATCH7[@]}" ;;
    8) run_batch "A11y & Navigation" "${BATCH8[@]}" ;;
    all)
        run_batch "Batch 1: Landing & Auth" "${BATCH1[@]}"
        run_batch "Batch 2: Dashboard & Goals" "${BATCH2[@]}"
        run_batch "Batch 3: Budgets & Bills" "${BATCH3[@]}"
        run_batch "Batch 4: Accounts & Transactions" "${BATCH4[@]}"
        run_batch "Batch 5: Debts & Credit" "${BATCH5[@]}"
        run_batch "Batch 6: Vision & Reports" "${BATCH6[@]}"
        run_batch "Batch 7: Settings & Kids" "${BATCH7[@]}"
        run_batch "Batch 8: A11y & Navigation" "${BATCH8[@]}"
        ;;
    quick)
        echo "Running quick smoke test (core pages only)..."
        run_batch "Quick Smoke Test" "e2e/dashboard.spec.ts" "e2e/goals.spec.ts"
        ;;
    *)
        echo "Usage: $0 [1-8|all|quick]"
        echo ""
        echo "Batches:"
        echo "  1 - Landing & Auth"
        echo "  2 - Dashboard & Goals"
        echo "  3 - Budgets & Bills"
        echo "  4 - Accounts & Transactions"
        echo "  5 - Debts & Credit"
        echo "  6 - Vision & Reports"
        echo "  7 - Settings & Kids"
        echo "  8 - Accessibility & Navigation"
        echo "  all - Run all batches"
        echo "  quick - Quick smoke test"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "Test run complete!"
echo "================================================"
