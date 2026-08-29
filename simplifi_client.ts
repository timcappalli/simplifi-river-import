import type {
  AppConfig,
  RiverTransaction,
  SimplifiCashFlowPayload,
  SimplifiHoldingPayload,
  SimplifiInvestmentPayload,
} from "./types.ts";

export class SimplifiClient {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "app-build": "67391",
      "app-client-id": "acme_web",
      "app-release": "6.25.0",
      authorization: `Bearer ${this.config.bearerToken || ""}`,
      "cache-control": "no-cache",
      "client-tid": crypto.randomUUID().toUpperCase(),
      "content-type": "application/json;charset=UTF-8",
      origin: "https://simplifi.quicken.com",
      pragma: "no-cache",
      priority: "u=1, i",
      "qcs-dataset-id": this.config.datasetId || "",
      referer: "https://simplifi.quicken.com/",
      "sec-ch-ua": '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    };
  }

  public buildHoldingPayload(tx: RiverTransaction): SimplifiHoldingPayload {
    const qty = tx.receivedAmount ?? 0;
    const price = tx.bitcoinPriceAmount ?? 0;
    const userCostBasis = tx.totalAmount ?? tx.costBasis ?? 0;

    return {
      clientId: crypto.randomUUID().toUpperCase(),
      accountId: this.config.accountId || "",
      quantity: qty,
      currentPrice: price,
      currentPriceAt: `${tx.postedOn}T08:00:00.000-04:00`,
      marketValue: qty * price,
      isDeleted: false,
      localSecurityId: this.config.localSecurityId,
      securityId: this.config.symbol,
      securityIdType: this.config.securityIdType,
      symbol: this.config.symbol,
      securityName: this.config.securityName,
      securityType: "STOCK",
      userCostBasis,
      userCostBasisOn: tx.postedOn,
    };
  }

  public buildCashFlowPayload(
    tx: RiverTransaction,
    amount: number,
    memo: string,
  ): SimplifiCashFlowPayload {
    return {
      type: "CASH_FLOW",
      id: null,
      accountId: this.config.accountId || "",
      clientId: crypto.randomUUID().toUpperCase(),
      postedOn: tx.postedOn,
      payee: this.config.defaultPayee,
      memo,
      coa: this.config.transferCoa,
      amount,
      split: null,
      state: "CLEARED",
      matchState: "NOT_MATCHED",
      isReviewed: true,
      source: "USER_ENTERED",
      isExcludedFromF2S: true,
      isExcludedFromReports: true,
      isDeleted: false,
      isBill: false,
      isSubscription: false,
      isBillable: false,
      check: {
        number: "",
        memo: "",
      },
    };
  }

  public buildInvestmentPayload(
    tx: RiverTransaction,
    investmentTxnType: "STOCK_DIVIDEND" | "SELL" | "BUY",
    amount: number,
    units: number,
    memo: string,
    commission = 0,
    costBasis = 0,
  ): SimplifiInvestmentPayload {
    return {
      type: "INVESTMENT",
      id: null,
      accountId: this.config.accountId || "",
      clientId: crypto.randomUUID().toUpperCase(),
      postedOn: tx.postedOn,
      payee: null,
      memo,
      coa: this.config.uncategorizedCoa,
      amount,
      split: null,
      state: "CLEARED",
      matchState: "NOT_MATCHED",
      isReviewed: true,
      source: "USER_ENTERED",
      isExcludedFromF2S: true,
      isExcludedFromReports: true,
      isDeleted: false,
      isBill: false,
      isSubscription: false,
      isBillable: false,
      investmentTxnType,
      symbol: this.config.symbol,
      units,
      costBasis,
      commission,
      splitNumerator: 0,
      splitDenominator: 0,
      securityName: this.config.securityName,
      securityId: this.config.symbol,
      securityIdType: this.config.securityIdType,
      localSecurityId: this.config.localSecurityId,
    };
  }

  public async createHolding(
    payload: SimplifiHoldingPayload,
  ): Promise<{ status: number; body: unknown }> {
    if (this.config.dryRun) {
      return { status: 200, body: { dryRun: true, type: "HOLDING", payload } };
    }

    // Ensure payload uses current localSecurityId if it was updated previously
    payload.localSecurityId = this.config.localSecurityId;

    const res = await fetch(
      "https://services.quicken.com/v2/investments/holdings",
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      },
    );

    const body = (await res.json().catch(() => null)) as {
      errors?: Array<{
        extData?: { conflictId?: string };
      }>;
    } | null;

    if (!res.ok) {
      if (res.status === 409 && body?.errors?.[0]?.extData?.conflictId) {
        const conflictId = body.errors[0].extData.conflictId;
        console.warn(
          `  [409 Conflict] Detected dataset localSecurityId '${conflictId}'. Updating localSecurityId and retrying...`,
        );
        this.config.localSecurityId = conflictId;
        payload.localSecurityId = conflictId;

        const retryRes = await fetch(
          "https://services.quicken.com/v2/investments/holdings",
          {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
          },
        );
        const retryBody = await retryRes.json().catch(() => null);
        if (!retryRes.ok) {
          throw new Error(
            `Simplifi Holdings API call failed with status ${retryRes.status}: ${JSON.stringify(retryBody)}`,
          );
        }
        return { status: retryRes.status, body: retryBody };
      }

      throw new Error(
        `Simplifi Holdings API call failed with status ${res.status}: ${JSON.stringify(body)}`,
      );
    }
    return { status: res.status, body };
  }

  public async createTransaction(
    payload: SimplifiCashFlowPayload | SimplifiInvestmentPayload,
  ): Promise<{ status: number; body: unknown }> {
    if (this.config.dryRun) {
      return { status: 200, body: { dryRun: true, type: payload.type, payload } };
    }

    if (payload.type === "INVESTMENT") {
      payload.localSecurityId = this.config.localSecurityId;
    }

    const res = await fetch("https://services.quicken.com/transactions", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => null)) as {
      errors?: Array<{
        extData?: { conflictId?: string };
      }>;
    } | null;

    if (!res.ok) {
      if (
        res.status === 409 &&
        payload.type === "INVESTMENT" &&
        body?.errors?.[0]?.extData?.conflictId
      ) {
        const conflictId = body.errors[0].extData.conflictId;
        console.warn(
          `  [409 Conflict] Detected dataset localSecurityId '${conflictId}'. Updating localSecurityId and retrying...`,
        );
        this.config.localSecurityId = conflictId;
        payload.localSecurityId = conflictId;

        const retryRes = await fetch("https://services.quicken.com/transactions", {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });
        const retryBody = await retryRes.json().catch(() => null);
        if (!retryRes.ok) {
          throw new Error(
            `Simplifi Transactions API call failed with status ${retryRes.status}: ${JSON.stringify(retryBody)}`,
          );
        }
        return { status: retryRes.status, body: retryBody };
      }

      throw new Error(
        `Simplifi Transactions API call failed with status ${res.status}: ${JSON.stringify(body)}`,
      );
    }
    return { status: res.status, body };
  }
}
