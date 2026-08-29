import { parse } from "@std/csv";
import type { RiverTransaction } from "./types.ts";

function parseNumber(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const num = Number.parseFloat(val.trim());
  return Number.isNaN(num) ? null : num;
}

function parseBoolean(val: string | undefined): boolean {
  if (!val) return false;
  return val.trim().toLowerCase() === "true";
}

function parsePostedDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.trim().split(" ");
  return parts[0];
}

export function parseRiverCsv(csvContent: string): RiverTransaction[] {
  const records = parse(csvContent, {
    skipFirstRow: true,
  }) as Record<string, string>[];

  const transactions: RiverTransaction[] = [];

  for (const record of records) {
    const rawDate = record["Date"] || "";
    const refCode = record["Reference Code"] || "";
    const transactionType = record["Transaction Type"] || "";

    // Ignore internal transfers per user instructions
    if (transactionType.trim() === "Internal Transfer") {
      continue;
    }

    const postedOn = parsePostedDate(rawDate);

    transactions.push({
      date: rawDate,
      postedOn,
      referenceCode: refCode,
      transactionType: transactionType.trim(),
      sentAmount: parseNumber(record["Sent Amount"]),
      sentCurrency: record["Sent Currency"] || "",
      receivedAmount: parseNumber(record["Received Amount"]),
      receivedCurrency: record["Received Currency"] || "",
      feeAmount: parseNumber(record["Fee Amount"]),
      feeCurrency: record["Fee Currency"] || "",
      totalAmount: parseNumber(record["Total Amount"]),
      totalCurrency: record["Total Currency"] || "",
      method: (record["Method"] || "").trim(),
      source: (record["Source"] || "").trim(),
      destination: (record["Destination"] || "").trim(),
      costBasis: parseNumber(record["Cost Basis"]),
      costBasisCurrency: record["Cost Basis Currency"] || "",
      bitcoinPriceAmount: parseNumber(record["Bitcoin Price Amount"]),
      bitcoinPriceCurrency: record["Bitcoin Price Currency"] || "",
      transactionId: record["Transaction ID"] || "",
      recurring: parseBoolean(record["Recurring"]),
      tag: record["Tag"] || "",
    });
  }

  return transactions;
}
