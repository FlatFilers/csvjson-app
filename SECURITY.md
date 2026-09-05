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

Conversions run entirely client-side, in your browser. The server layer is thin: static serving and legacy redirects (`index.php`), feedback votes (`POST /api/feedback`), and browser-side S3 permalink hydration — legacy endpoints such as `/csv2json/instrument` and `/csv2json/upload` are gone (410). Script injection through crafted input is an example of an in-scope area; feel free to include anything else that looks wrong.

## Disclosure

Please coordinate disclosure through the advisory and allow time for a fix to ship before publishing details.
