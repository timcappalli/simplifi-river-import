import { assertEquals, assertExists } from "@std/assert";
import { SimplifiClient } from "./simplifi_client.ts";
import type { AppConfig, RiverTransaction } from "./types.ts";

const mockConfig: AppConfig = {
  bearerToken: "test-token",
  datasetId: "123456",
  accountId: "789012",
  defaultPayee: "Tim Cappalli",
  symbol: "^BTCUSD",
  securityName: "Bitcoin - USD",
  localSecurityId: "423695232794192128",
  securityIdType: "QCSSYMBOL",
  transferCoa: { type: "BALANCE_ADJUSTMENT", id: "2" },
  uncategorizedCoa: { type: "UNCATEGORIZED", id: "0" },
  dryRun: true,
};

const sampleTx: RiverTransaction = {
  date: "2020-08-17 12:34:33",
  postedOn: "2020-08-17",
  referenceCode: "L3PMWTZB",
  transactionType: "Buy",
  sentAmount: 5000,
  sentCurrency: "USD",
  receivedAmount: 0.43687985,
  receivedCurrency: "BTC",
  feeAmount: 0,
  feeCurrency: "USD",
  totalAmount: 5000,
  totalCurrency: "USD",
  method: "ACH Bank Transfer",
  source: "Checking ··1622",
  destination: "Bitcoin Balance",
  costBasis: 5000,
  costBasisCurrency: "USD",
  bitcoinPriceAmount: 11444.79,
  bitcoinPriceCurrency: "USD",
  transactionId: "",
  recurring: false,
  tag: "",
};

Deno.test("buildHoldingPayload builds correct JSON payload", () => {
  const client = new SimplifiClient(mockConfig);
  const payload = client.buildHoldingPayload(sampleTx);

  assertEquals(payload.accountId, "789012");
  assertEquals(payload.quantity, 0.43687985);
  assertEquals(payload.currentPrice, 11444.79);
  assertEquals(payload.userCostBasis, 5000);
  assertEquals(payload.userCostBasisOn, "2020-08-17");
  assertEquals(payload.symbol, "^BTCUSD");
  assertExists(payload.clientId);
});

Deno.test("buildCashFlowPayload builds correct CASH_FLOW payload", () => {
  const client = new SimplifiClient(mockConfig);
  const payload = client.buildCashFlowPayload(sampleTx, 5000, "Test memo");

  assertEquals(payload.type, "CASH_FLOW");
  assertEquals(payload.accountId, "789012");
  assertEquals(payload.payee, "Tim Cappalli");
  assertEquals(payload.amount, 5000);
  assertEquals(payload.coa, { type: "BALANCE_ADJUSTMENT", id: "2" });
  assertEquals(payload.memo, "Test memo");
});

Deno.test("buildInvestmentPayload builds STOCK_DIVIDEND payload", () => {
  const client = new SimplifiClient(mockConfig);
  const payload = client.buildInvestmentPayload(
    sampleTx,
    "STOCK_DIVIDEND",
    0,
    0.00005524,
    "Interest Payout",
  );

  assertEquals(payload.type, "INVESTMENT");
  assertEquals(payload.investmentTxnType, "STOCK_DIVIDEND");
  assertEquals(payload.amount, 0);
  assertEquals(payload.units, 0.00005524);
  assertEquals(payload.coa, { type: "UNCATEGORIZED", id: "0" });
});

Deno.test("buildInvestmentPayload builds SELL payload", () => {
  const client = new SimplifiClient(mockConfig);
  const payload = client.buildInvestmentPayload(
    sampleTx,
    "SELL",
    14203.36,
    -0.2121,
    "Sell BTC",
  );

  assertEquals(payload.type, "INVESTMENT");
  assertEquals(payload.investmentTxnType, "SELL");
  assertEquals(payload.amount, 14203.36);
  assertEquals(payload.units, -0.2121);
});
