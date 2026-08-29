import { loadConfig } from "./config.ts";
import { parseRiverCsv } from "./csv_parser.ts";
import { SimplifiClient } from "./simplifi_client.ts";
import {
  clearState,
  loadState,
  saveState,
} from "./state_manager.ts";
import type { RiverTransaction } from "./types.ts";

function printHelp() {
  console.log(`
River Financial CSV to Simplifi Importer

Usage:
  deno task start --file <csv_file> [options]

Options:
  -f, --file <path>              Path to River Financial CSV file
  -c, --config <path>            Path to JSON config file (default: config.json)
  -t, --token <bearer_token>     Simplifi API Bearer token
  -d, --dataset-id <id>          Simplifi dataset ID (qcs-dataset-id)
  -a, --account-id <id>          Simplifi account ID
  -p, --payee <name>             Default payee name for transfers (default: "Tim Cappalli")
  -r, --resume                   Automatically resume from last saved state without asking
      --fresh                    Ignore saved state and start fresh from the beginning
  -n, --dry-run                  Preview generated API payloads without sending HTTP requests
  -h, --help                     Show this help message

Environment Variables:
  SIMPLIFI_BEARER_TOKEN          Simplifi API Bearer token
  SIMPLIFI_DATASET_ID            Simplifi dataset ID
  SIMPLIFI_ACCOUNT_ID            Simplifi account ID
`);
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processTransactions(
  transactions: RiverTransaction[],
  client: SimplifiClient,
  dryRun: boolean,
  delayMinMs = 300,
  delayMaxMs = 800,
  filePath = "",
  initialCompletedRefs: string[] = [],
) {
  let processedCount = 0;
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const completedRefsSet = new Set<string>(initialCompletedRefs);

  async function applyDelay() {
    if (!dryRun && delayMaxMs > 0) {
      const delay = getRandomDelay(delayMinMs, delayMaxMs);
      await sleep(delay);
    }
  }

  async function markCompleted(i: number, refCode: string) {
    if (refCode) {
      completedRefsSet.add(refCode);
    }
    if (!dryRun && filePath) {
      await saveState({
        filePath,
        totalRecords: transactions.length,
        lastSuccessfulIndex: i,
        completedRefCodes: Array.from(completedRefsSet),
        timestamp: new Date().toISOString(),
      });
    }
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const itemNum = i + 1;

    if (completedRefsSet.has(tx.referenceCode)) {
      console.log(
        `[${itemNum}/${transactions.length}] Skipping previously completed transaction (Ref: ${tx.referenceCode})`,
      );
      skippedCount++;
      continue;
    }

    try {
      switch (tx.transactionType) {
        case "Buy": {
          const isAch = tx.method.toLowerCase().includes("ach");
          if (isAch) {
            const transferAmount = tx.totalAmount ?? tx.sentAmount ?? 0;
            const transferMemo = `River ACH Bank Transfer from ${tx.source || "Bank"} (Ref: ${tx.referenceCode})`;

            console.log(
              `[${itemNum}/${transactions.length}] [Buy/ACH] Creating cash transfer $${transferAmount}...`,
            );
            const cashFlowPayload = client.buildCashFlowPayload(
              tx,
              transferAmount,
              transferMemo,
            );
            if (dryRun) {
              console.log("  [DRY RUN] Cash Flow Payload:", JSON.stringify(cashFlowPayload));
            }
            await client.createTransaction(cashFlowPayload);
            await applyDelay();
          }

          const units = tx.receivedAmount ?? 0;
          const totalUsd = Math.abs(tx.totalAmount ?? tx.sentAmount ?? 0);
          const amount = -totalUsd;
          const costBasis = -totalUsd;
          const commission = tx.feeAmount ? -Math.abs(tx.feeAmount) : 0;
          const memo = `River Buy ${units} BTC (Ref: ${tx.referenceCode})`;

          console.log(
            `[${itemNum}/${transactions.length}] [Buy] Creating BUY transaction for ${units} BTC ($${totalUsd}, fee: $${Math.abs(commission)})...`,
          );
          const buyPayload = client.buildInvestmentPayload(
            tx,
            "BUY",
            amount,
            units,
            memo,
            commission,
            costBasis,
          );
          if (dryRun) {
            console.log("  [DRY RUN] Investment Buy Payload:", JSON.stringify(buyPayload));
          }
          await client.createTransaction(buyPayload);
          await applyDelay();
          await markCompleted(i, tx.referenceCode);
          successCount++;
          break;
        }

        case "Cash Deposit": {
          const depositAmount = Math.abs(tx.totalAmount ?? tx.receivedAmount ?? 0);
          const memo = `River Cash Deposit from ${tx.source || "Bank"} (Ref: ${tx.referenceCode})`;

          console.log(
            `[${itemNum}/${transactions.length}] [Cash Deposit] Creating deposit $${depositAmount}...`,
          );
          const payload = client.buildCashFlowPayload(tx, depositAmount, memo);
          if (dryRun) {
            console.log("  [DRY RUN] Cash Deposit Payload:", JSON.stringify(payload));
          }
          await client.createTransaction(payload);
          await applyDelay();
          await markCompleted(i, tx.referenceCode);
          successCount++;
          break;
        }

        case "Cash Withdrawal": {
          const withdrawalAmount = -Math.abs(tx.totalAmount ?? tx.sentAmount ?? 0);
          const memo = `River Cash Withdrawal to ${tx.destination || "Bank"} (Ref: ${tx.referenceCode})`;

          console.log(
            `[${itemNum}/${transactions.length}] [Cash Withdrawal] Creating withdrawal $${withdrawalAmount}...`,
          );
          const payload = client.buildCashFlowPayload(tx, withdrawalAmount, memo);
          if (dryRun) {
            console.log("  [DRY RUN] Cash Withdrawal Payload:", JSON.stringify(payload));
          }
          await client.createTransaction(payload);
          await applyDelay();
          await markCompleted(i, tx.referenceCode);
          successCount++;
          break;
        }

        case "Interest Payout": {
          const units = tx.receivedAmount ?? 0;
          const memo = `River Interest Payout (Ref: ${tx.referenceCode})`;

          console.log(
            `[${itemNum}/${transactions.length}] [Interest Payout] Creating STOCK_DIVIDEND for ${units} BTC...`,
          );
          const payload = client.buildInvestmentPayload(
            tx,
            "STOCK_DIVIDEND",
            0,
            units,
            memo,
          );
          if (dryRun) {
            console.log("  [DRY RUN] Interest Payout Payload:", JSON.stringify(payload));
          }
          await client.createTransaction(payload);
          await applyDelay();
          await markCompleted(i, tx.referenceCode);
          successCount++;
          break;
        }

        case "Sell": {
          const units = -Math.abs(tx.sentAmount ?? tx.receivedAmount ?? 0);
          const amount = Math.abs(tx.receivedAmount ?? tx.totalAmount ?? 0);
          const commission = tx.feeAmount ? -Math.abs(tx.feeAmount) : 0;
          const memo = `River Sell (Ref: ${tx.referenceCode})`;

          console.log(
            `[${itemNum}/${transactions.length}] [Sell] Creating SELL transaction for ${units} BTC ($${amount}, fee: $${Math.abs(commission)})...`,
          );
          const payload = client.buildInvestmentPayload(
            tx,
            "SELL",
            amount,
            units,
            memo,
            commission,
            0,
          );
          if (dryRun) {
            console.log("  [DRY RUN] Sell Payload:", JSON.stringify(payload));
          }
          await client.createTransaction(payload);
          await applyDelay();
          await markCompleted(i, tx.referenceCode);
          successCount++;
          break;
        }

        default: {
          console.warn(
            `[${itemNum}/${transactions.length}] Skipping unknown transaction type '${tx.transactionType}' (Ref: ${tx.referenceCode})`,
          );
          skippedCount++;
          break;
        }
      }
      processedCount++;
    } catch (err) {
      errorCount++;
      console.error(
        `\n[FATAL API ERROR] Stopping import sequence at row ${itemNum} (${tx.transactionType}, Ref: ${tx.referenceCode}):\n`,
        err instanceof Error ? err.message : err,
      );
      console.error(
        `\nSequence halted. Progress saved up to record ${itemNum - 1}. You can resume where you left off after fixing the issue.`,
      );
      break;
    }
  }

  if (errorCount === 0 && !dryRun && filePath) {
    await clearState(filePath);
  }

  return { processedCount, successCount, skippedCount, errorCount };
}

if (import.meta.main) {
  const config = await loadConfig(Deno.args);

  if (Deno.args.includes("-h") || Deno.args.includes("--help")) {
    printHelp();
    Deno.exit(0);
  }

  if (!config.filePath) {
    console.error("Error: CSV file path is required. Use --file <path> or set 'filePath' in config.json.");
    printHelp();
    Deno.exit(1);
  }

  if (!config.dryRun) {
    if (!config.bearerToken) {
      console.error("Error: Bearer token is required for live import. Pass --token, set SIMPLIFI_BEARER_TOKEN, or add 'bearerToken' to config.json.");
      Deno.exit(1);
    }
    if (!config.datasetId) {
      console.error("Error: Dataset ID is required for live import. Pass --dataset-id, set SIMPLIFI_DATASET_ID, or add 'datasetId' to config.json.");
      Deno.exit(1);
    }
    if (!config.accountId) {
      console.error("Error: Account ID is required for live import. Pass --account-id, set SIMPLIFI_ACCOUNT_ID, or add 'accountId' to config.json.");
      Deno.exit(1);
    }
  }

  console.log(`Reading River Financial CSV from '${config.filePath}'...`);
  const csvContent = await Deno.readTextFile(config.filePath);

  const transactions = parseRiverCsv(csvContent);
  console.log(`Found ${transactions.length} valid transactions to process (internal transfers ignored).`);

  let initialCompletedRefs: string[] = [];

  // Check state for resume
  const existingState = await loadState(config.filePath);
  if (
    existingState &&
    existingState.completedRefCodes.length > 0 &&
    existingState.lastSuccessfulIndex < transactions.length - 1
  ) {
    let resume = false;
    if (config.fresh) {
      resume = false;
      await clearState(config.filePath);
      console.log("Starting fresh import (--fresh specified). Saved state cleared.");
    } else if (config.resume) {
      resume = true;
      console.log("Resuming import from saved state (--resume specified).");
    } else {
      const promptMsg = `\nFound previous incomplete import for '${config.filePath}' (${existingState.completedRefCodes.length} of ${transactions.length} transactions completed on ${existingState.timestamp}).\nDo you want to resume where you left off?`;
      resume = confirm(promptMsg);
      if (!resume) {
        await clearState(config.filePath);
        console.log("Saved state cleared. Starting from the beginning.");
      }
    }

    if (resume) {
      initialCompletedRefs = existingState.completedRefCodes;
      console.log(`Resuming: ${initialCompletedRefs.length} previously completed transactions will be skipped.`);
    }
  }

  if (config.dryRun) {
    console.log("=== DRY RUN MODE: No network calls will be made ===\n");
  }

  const client = new SimplifiClient(config);
  const summary = await processTransactions(
    transactions,
    client,
    config.dryRun,
    config.delayMinMs,
    config.delayMaxMs,
    config.filePath,
    initialCompletedRefs,
  );

  console.log("\n=== Summary ===");
  console.log(`Total records:     ${transactions.length}`);
  console.log(`Successfully sent: ${summary.successCount}`);
  console.log(`Skipped:           ${summary.skippedCount}`);
  console.log(`Errors:            ${summary.errorCount}`);
}
