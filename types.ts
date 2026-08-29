export interface RiverTransaction {
  date: string; // ISO string or YYYY-MM-DD HH:mm:ss
  postedOn: string; // YYYY-MM-DD
  referenceCode: string;
  transactionType: string; // "Buy", "Sell", "Cash Deposit", "Cash Withdrawal", "Interest Payout", "Internal Transfer"
  sentAmount: number | null;
  sentCurrency: string;
  receivedAmount: number | null;
  receivedCurrency: string;
  feeAmount: number | null;
  feeCurrency: string;
  totalAmount: number | null;
  totalCurrency: string;
  method: string; // "ACH Bank Transfer", "Cash Balance", etc.
  source: string;
  destination: string;
  costBasis: number | null;
  costBasisCurrency: string;
  bitcoinPriceAmount: number | null;
  bitcoinPriceCurrency: string;
  transactionId: string;
  recurring: boolean;
  tag: string;
}

export interface AppConfig {
  bearerToken?: string;
  datasetId?: string;
  accountId?: string;
  defaultPayee: string;
  symbol: string;
  securityName: string;
  localSecurityId: string;
  securityIdType: string;
  transferCoa: {
    type: string;
    id: string;
  };
  uncategorizedCoa: {
    type: string;
    id: string;
  };
  dryRun: boolean;
  delayMinMs: number;
  delayMaxMs: number;
  resume?: boolean;
  fresh?: boolean;
  filePath?: string;
}

export interface SimplifiHoldingPayload {
  clientId: string;
  accountId: string;
  quantity: number;
  currentPrice: number;
  currentPriceAt: string;
  marketValue: number;
  isDeleted: boolean;
  localSecurityId: string;
  securityId: string;
  securityIdType: string;
  symbol: string;
  securityName: string;
  securityType: string;
  userCostBasis: number;
  userCostBasisOn: string;
}

export interface SimplifiCashFlowPayload {
  type: "CASH_FLOW";
  id: null | string;
  accountId: string;
  clientId: string;
  postedOn: string;
  payee: string | null;
  memo: string;
  coa: {
    type: string;
    id: string;
  };
  amount: number;
  split: null;
  state: string;
  matchState: string;
  isReviewed: boolean;
  source: string;
  isExcludedFromF2S: boolean;
  isExcludedFromReports: boolean;
  isDeleted: boolean;
  isBill: boolean;
  isSubscription: boolean;
  isBillable: boolean;
  check: {
    number: string;
    memo: string;
  };
}

export interface SimplifiInvestmentPayload {
  type: "INVESTMENT";
  id: null | string;
  accountId: string;
  clientId: string;
  postedOn: string;
  payee: string | null;
  memo: string;
  coa: {
    type: string;
    id: string;
  };
  amount: number;
  split: null;
  state: string;
  matchState: string;
  isReviewed: boolean;
  source: string;
  isExcludedFromF2S: boolean;
  isExcludedFromReports: boolean;
  isDeleted: boolean;
  isBill: boolean;
  isSubscription: boolean;
  isBillable: boolean;
  investmentTxnType: "STOCK_DIVIDEND" | "SELL" | "BUY" | string;
  symbol: string;
  units: number;
  costBasis: number;
  commission: number;
  splitNumerator: number;
  splitDenominator: number;
  securityName: string;
  securityId: string;
  securityIdType: string;
  localSecurityId: string;
}
