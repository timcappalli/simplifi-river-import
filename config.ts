import { parseArgs } from "@std/cli/parse-args";
import { load as loadEnv } from "@std/dotenv";
import type { AppConfig } from "./types.ts";

export async function loadConfig(args: string[]): Promise<AppConfig> {
  const parsedArgs = parseArgs(args, {
    string: [
      "config",
      "file",
      "token",
      "dataset-id",
      "account-id",
      "payee",
      "symbol",
      "security-name",
      "local-security-id",
    ],
    boolean: ["dry-run", "help", "resume", "fresh"],
    alias: {
      c: "config",
      f: "file",
      t: "token",
      d: "dataset-id",
      a: "account-id",
      n: "dry-run",
      r: "resume",
      h: "help",
    },
    default: {
      "dry-run": false,
    },
  });

  // Load .env if present (fails silently if file doesn't exist)
  try {
    await loadEnv({ export: true });
  } catch {
    // Ignore if .env does not exist
  }

  let fileConfig: Partial<AppConfig> = {};
  const configFilePath = parsedArgs.config || "config.json";

  try {
    const text = await Deno.readTextFile(configFilePath);
    fileConfig = JSON.parse(text);
  } catch (_e) {
    if (parsedArgs.config) {
      console.warn(`Warning: Specified config file '${parsedArgs.config}' could not be read.`);
    }
  }

  const bearerToken =
    parsedArgs.token ||
    Deno.env.get("SIMPLIFI_BEARER_TOKEN") ||
    fileConfig.bearerToken;

  const datasetId =
    parsedArgs["dataset-id"] ||
    Deno.env.get("SIMPLIFI_DATASET_ID") ||
    fileConfig.datasetId;

  const accountId =
    parsedArgs["account-id"] ||
    Deno.env.get("SIMPLIFI_ACCOUNT_ID") ||
    fileConfig.accountId;

  const defaultPayee =
    parsedArgs.payee ||
    Deno.env.get("SIMPLIFI_DEFAULT_PAYEE") ||
    fileConfig.defaultPayee ||
    "Tim Cappalli";

  const symbol =
    parsedArgs.symbol ||
    Deno.env.get("SIMPLIFI_SYMBOL") ||
    fileConfig.symbol ||
    "^BTCUSD";

  const securityName =
    parsedArgs["security-name"] ||
    Deno.env.get("SIMPLIFI_SECURITY_NAME") ||
    fileConfig.securityName ||
    "Bitcoin - USD";

  const localSecurityId =
    parsedArgs["local-security-id"] ||
    Deno.env.get("SIMPLIFI_LOCAL_SECURITY_ID") ||
    fileConfig.localSecurityId ||
    "553802012631515648";

  const securityIdType = fileConfig.securityIdType || "QCSSYMBOL";

  const transferCoa = fileConfig.transferCoa || {
    type: "BALANCE_ADJUSTMENT",
    id: "2",
  };

  const uncategorizedCoa = fileConfig.uncategorizedCoa || {
    type: "UNCATEGORIZED",
    id: "0",
  };

  const filePath = parsedArgs.file || fileConfig.filePath;
  const dryRun = Boolean(parsedArgs["dry-run"] || fileConfig.dryRun);

  const delayMinMs =
    Number(parsedArgs["delay-min"]) ||
    fileConfig.delayMinMs ||
    300;

  const delayMaxMs =
    Number(parsedArgs["delay-max"]) ||
    fileConfig.delayMaxMs ||
    800;

  return {
    bearerToken,
    datasetId,
    accountId,
    defaultPayee,
    symbol,
    securityName,
    localSecurityId,
    securityIdType,
    transferCoa,
    uncategorizedCoa,
    dryRun,
    delayMinMs,
    delayMaxMs,
    resume: parsedArgs.resume,
    fresh: parsedArgs.fresh,
    filePath,
  };
}
