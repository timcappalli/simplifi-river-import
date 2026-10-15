# River Financial to Simplifi Importer

A Deno / TypeScript application to parse transaction CSV exports from River Financial (Bitcoin) and import them into Quicken Simplifi using Simplifi's REST APIs.

## Features

- **Buy (ACH Bank Transfer)**: Creates a Cash Flow deposit (`CASH_FLOW`, category "BALANCE_ADJUSTMENT") and an Investment Buy transaction (`INVESTMENT`, `investmentTxnType: "BUY"`).
- **Buy (Cash Balance)**: Creates an Investment Buy transaction (`INVESTMENT`, `investmentTxnType: "BUY"`).
- **Cash Deposit**: Creates a Cash Flow deposit transaction (`CASH_FLOW`).
- **Cash Withdrawal**: Creates a Cash Flow withdrawal transaction (`CASH_FLOW` with negative amount).
- **Interest Payout**: Creates an Investment transaction (`INVESTMENT`, `investmentTxnType: "STOCK_DIVIDEND"`).
- **Sell**: Creates an Investment transaction (`INVESTMENT`, `investmentTxnType: "SELL"`).
- **Internal Transfers**: Automatically filtered out and ignored.
- **State Persistence & Resume**: Saves progress automatically after each successful transaction. If an import is interrupted (e.g. token expiration, network error, or rate limits), re-running the tool prompts you to resume where you left off.
- **Configurable Payee**: Set payee via `config.json`, `.env` (`SIMPLIFI_DEFAULT_PAYEE`), or `--payee <name>` (defaults to `"Unknown"` if omitted).
- **Config & Auth**: Supports configuration via `config.json`, `.env`, environment variables, or CLI arguments.
- **Chrome User-Agent**: Uses standard Chrome headers (`user-agent`, `sec-ch-ua`, etc.) for API requests.
- **Dry-Run Mode**: Inspect generated API payloads without sending HTTP requests.

## Prerequisites

- [Deno](https://deno.com/) 1.x or 2.x installed.

## Configuration

You can configure credentials using a `config.json` file, environment variables, or CLI flags.

### Option A: JSON Configuration (`config.json`)

Create a `config.json` file based on `config.example.json`:

```json
{
  "bearerToken": "YOUR_SIMPLIFI_BEARER_TOKEN",
  "datasetId": "203410654309383424",
  "accountId": "553800778533061120",
  "defaultPayee": "Unknown",
  "symbol": "^BTCUSD",
  "securityName": "Bitcoin - USD",
  "localSecurityId": "553802012631515648",
  "dryRun": false
}
```

### Option B: Environment Variables / `.env`

Create a `.env` file in the root directory:

```env
SIMPLIFI_BEARER_TOKEN=YOUR_SIMPLIFI_BEARER_TOKEN
SIMPLIFI_DATASET_ID=203410654309383424
SIMPLIFI_ACCOUNT_ID=553800778533061120
SIMPLIFI_DEFAULT_PAYEE=Unknown
```

## How to Find Simplifi API Credentials

To find your Simplifi API credentials (`bearerToken`, `datasetId`, `accountId`, `localSecurityId`), open Simplifi in Google Chrome and inspect network requests using Developer Tools:

1. Open **<https://simplifi.quicken.com>** in Google Chrome and log in to your account.
2. Open Chrome Developer Tools by pressing `F12` (or `Cmd + Option + I` on Mac / `Ctrl + Shift + I` on Windows).
3. Switch to the **Network** tab.
4. Perform an action in Simplifi (e.g., click on your target account or refresh the page) to trigger API calls to `services.quicken.com`.
5. Click on any network request sent to `services.quicken.com` (such as `transactions`, `holdings`, `accounts`, or `user`).

---

### 1. `bearerToken` (Authorization Token)

- **What it is**: Your active session authentication token.
- **Where to find it**: In the DevTools Network tab, inspect the **Headers** -> **Request Headers** section of any request to `services.quicken.com`. Look for:

  ```http
  authorization: Bearer eyJhbGci...
  ```

  Copy the long token string after `Bearer`.

---

### 2. `datasetId` (`qcs-dataset-id`)

- **What it is**: The unique 18-digit ID for your Quicken / Simplifi user dataset.
- **Where to find it**: In the **Request Headers** section of any request to `services.quicken.com`, look for:

  ```http
  qcs-dataset-id: 203410654309383424
  ```

---

### 3. `accountId`

- **What it is**: The internal 18-digit Simplifi ID for your specific investment/brokerage account.
- **Where to find it**:
  - Click on your Bitcoin / River Financial account under **Investments** or **Accounts** in Simplifi.
  - In the DevTools Network tab, filter requests by `transactions` or `accounts`.
  - Look at the Request Payload or Response JSON for your account's `"accountId"` field:

    ```json
    "accountId": "553800778533061120"
    ```

---

### 4. `localSecurityId`

- **What it is**: The internal Simplifi ID assigned to symbol `^BTCUSD` (Bitcoin - USD) within your specific dataset.
- **Where to find it**:
  - Filter Network requests in DevTools by `transactions` or `holdings`.
  - Inspect any payload or response containing `"symbol": "^BTCUSD"`. Look for `"localSecurityId"`:

    ```json
    "localSecurityId": "553802012631515648"
    ```

  - *Note*: If you aren't sure of your `localSecurityId`, the importer includes automatic 409 Conflict resolution to detect and update `localSecurityId` automatically!

---

## Usage

### Run Dry-Run (Preview Payloads)

```bash
deno task start --file path/to/river.csv --dry-run
```

### Run Live Import

```bash
deno task start --file path/to/river.csv
```

### Using CLI Options

```bash
deno task start \
  --file river.csv \
  --token "YOUR_BEARER_TOKEN" \
  --dataset-id "203410654309383424" \
  --account-id "553800778533061120" \
  --payee "John Doe"
```

### Run Unit Tests

```bash
deno task test
```
