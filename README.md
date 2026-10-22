# REDD Currency Converter

A standalone browser app that converts currency amounts embedded in rich text to USD, preserving formatting.

## What it does

- Automatically loads every three-letter currency code exposed by the same public `@fawazahmed0/currency-api` / jsDelivr source observed in the REDD editor.
- Includes a searchable rate table (currency code, currency name and USD rate).
- Automatically converts any available three-letter currency code found in pasted text (for example BRL, CLP, COP, PEN, HKD, EUR or GBP).
- Supports manual overrides such as `1 HKD = USD 0.12`.
- Recognizes amounts such as `HKD 7.39bn`, `BRL 5 billion`, `COP 3,536 thousand`, and `PEN 0.33`.
- Preserves rich text and provides Copy as rich text / Copy as HTML.
- Adds `at today's exchange rate` to the first converted amount by default.

## Deploy to Vercel

This project is intentionally static and has no build step.

1. Put these files in a GitHub repository.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Framework preset: **Other**.
4. Leave Build Command empty.
5. Leave Output Directory empty.
6. Deploy.

You can also run it locally by opening `index.html` in a browser. For reliable clipboard permissions and API requests, serving it from Vercel/localhost is preferable.

## Rate source

Date-specific URLs have this pattern:

`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@YYYY-MM-DD/v1/currencies/brl.json`

The app tries today first, then falls back up to 6 days if that date is not yet available. It loads the API currency catalog plus USD cross-rates in one pass, while manual overrides remain available.


Formatting rules:
- USD values shown in bn always use 2 decimal places (e.g. USD 1.40bn).
- USD values shown in m always use 1 decimal place (e.g. USD 886.8m).

Formatting rule: USD billions use two decimals unless the decimals are .00 (e.g. USD 12bn); USD millions use one decimal unless it is .0 (e.g. USD 5m).

## UF support

The app also recognizes Chile's Unidad de Fomento in either order, for example `UF 500,000` or `500,000 UF`. It fetches the official daily UF value from the Banco Central de Chile official daily indicators/BDE series through the app's `/api/uf` serverless endpoint, converts UF to CLP, then converts CLP to USD using the same currency API used elsewhere in the app.

Example output: `UF 500,000, or CLP 20.6bn (USD 21.1m at today's exchange rate)`.


UF parsing supports the same scales as currencies in either order, including `UF 10m`, `10m UF`, `UF 9.4bn`, `UF 5 million`, `UF 500,000`, and equivalents.
