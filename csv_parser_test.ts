import { assertEquals } from "@std/assert";
import { parseRiverCsv } from "./csv_parser.ts";

const SAMPLE_CSV = `Date,Reference Code,Transaction Type,Sent Amount,Sent Currency,Received Amount,Received Currency,Fee Amount,Fee Currency,Total Amount,Total Currency,Method,Source,Destination,Cost Basis,Cost Basis Currency,Bitcoin Price Amount,Bitcoin Price Currency,Transaction ID,Recurring,Tag
2020-08-17 12:34:33,L3PMWTZB,Buy,5000.00,USD,0.43687985,BTC,0.00,USD,5000.00,USD,ACH Bank Transfer,Checking ··1622,Bitcoin Balance,5000.00,USD,11444.79,USD,,False,
2021-07-18 16:33:07,33QINTHP,Internal Transfer,,,0.00298325,BTC,0,BTC,0.00298325,BTC,Internal Transfer,ZZYBY4FQ Bitcoin Balance Archived Account,Bitcoin Balance,,,,,,False,
2022-12-09 02:29:37,5QAF65WY,Sell,0.07752906,BTC,1313.08,USD,15.95,USD,1329.03,USD,Bitcoin Balance,Bitcoin Balance,Cash Balance,4100.00,USD,17142.35,USD,,False,
2022-12-09 02:49:41,KBAAC2WG,Cash Withdrawal,1313.08,USD,,,0.00,USD,1313.08,USD,ACH Bank Transfer,Cash Balance,Investing Cash ··3416,,,,,,False,
2024-12-23 16:38:13,HFSIHT74,Cash Deposit,,,6250.00,USD,0.00,USD,6250.00,USD,Cash Deposit,Investing Cash ··3416,Cash Balance,,,,,,False,
2025-01-01 11:48:37,NWZPEOQ7,Interest Payout,,,0.00005524,BTC,0.00,USD,0.00005524,BTC,Interest Earned,Cash Balance,Bitcoin Balance,5.16,USD,93403.64,USD,,False,Interest`;

Deno.test("parseRiverCsv parses transactions and ignores Internal Transfer", () => {
  const txs = parseRiverCsv(SAMPLE_CSV);
  assertEquals(txs.length, 5); // 6 rows minus 1 internal transfer

  // Row 1: Buy
  assertEquals(txs[0].transactionType, "Buy");
  assertEquals(txs[0].referenceCode, "L3PMWTZB");
  assertEquals(txs[0].postedOn, "2020-08-17");
  assertEquals(txs[0].sentAmount, 5000.0);
  assertEquals(txs[0].receivedAmount, 0.43687985);
  assertEquals(txs[0].method, "ACH Bank Transfer");

  // Row 2: Sell
  assertEquals(txs[1].transactionType, "Sell");
  assertEquals(txs[1].referenceCode, "5QAF65WY");
  assertEquals(txs[1].sentAmount, 0.07752906);
  assertEquals(txs[1].receivedAmount, 1313.08);

  // Row 3: Cash Withdrawal
  assertEquals(txs[2].transactionType, "Cash Withdrawal");
  assertEquals(txs[2].totalAmount, 1313.08);

  // Row 4: Cash Deposit
  assertEquals(txs[3].transactionType, "Cash Deposit");
  assertEquals(txs[3].receivedAmount, 6250.0);

  // Row 5: Interest Payout
  assertEquals(txs[4].transactionType, "Interest Payout");
  assertEquals(txs[4].receivedAmount, 0.00005524);
});
