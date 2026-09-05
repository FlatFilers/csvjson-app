# Security Policy

## Reporting a Vulnerability

Do **not** open a public issue for security reports — public issues disclose the problem before a fix is ready.

Report vulnerabilities through GitHub's private security advisory flow on this repository:

**https://github.com/FlatFilers/csvjson-app/security/advisories/new**

(Also reachable via the repository's **Security** tab → **Report a vulnerability**.) This is the designated contact for security matters. Private advisories keep details confidential while a fix is prepared and shipped.

## What to include

- A short description of the vulnerability and its impact.
- The affected area — page, conversion direction, or endpoint.
- Minimal steps to reproduce, ideally with a sample input that triggers it.

## Response window

You can expect an acknowledgment within **48–72 hours** of filing an advisory. Complex or hard-to-reproduce reports may take longer to assess fully; we will keep the advisory thread updated as the investigation progresses.

## Scope notes

The conversion tools run client-side — conversions execute entirely in your browser — with a thin server layer for page serving, telemetry (`POST /csv2json/instrument`), and saved permalinks. Script injection through crafted input and the handling of uploaded files are examples of in-scope areas; feel free to include anything else that looks wrong.

## Disclosure

Please coordinate disclosure through the advisory and allow time for a fix to ship before publishing details.
