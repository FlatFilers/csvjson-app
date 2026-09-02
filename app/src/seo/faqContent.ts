/**
 * FAQ copy and structured data (spec: SEO — FAQ + structured data). One
 * source of truth: the accordion renders the items, and the FAQPage JSON-LD
 * is derived from the same list, so the machine-readable markup can never
 * drift from what users read.
 */
export const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: "How does it work?",
    answer:
      "Paste CSV or JSON into the left pane and the conversion runs as you type — no upload, no submit button. Flip the direction with the switch between the panes to convert JSON back to CSV, then copy the result or download it as a file. The converter understands quoted fields, embedded separators, and Unicode.",
  },
  {
    question: "What do the options do?",
    answer:
      "Separator picks the delimiter — auto-detect covers comma, semicolon, and tab. Parse numbers is off by default because it turns 00721 into 7; turn it on only when plain numeric cells should become real JSON numbers. Parse JSON converts null, true, false, [] and {} cells into real JSON values instead of strings. Transpose flips rows and columns; Hash output makes the first column the object key; Minify removes indentation from JSON output. On the JSON to CSV side, Flatten explodes nested arrays into extra rows with dotted keys.",
  },
  {
    question: "TSV vs CSV — what changes?",
    answer:
      "Only the delimiter: TSV separates cells with tabs, CSV with commas. Anything you can paste from Excel or Google Sheets is tab-separated, and auto-detect picks that up — or choose Tab in the separator menu. Quoting rules only apply to comma and semicolon output; TSV rarely needs them.",
  },
  {
    question: "Does my data ever leave the browser?",
    answer:
      "No. The conversion runs entirely in your browser — nothing is uploaded, nothing is stored, nothing is logged. Files you open are read locally in the page, there is no account and no server processing. The site's analytics never see your data: Plausible counts visits cookieless, and the Google tag is a standard conversion-measurement tag that uses the page URL, referrer, and a first-party conversion cookie to measure ad performance. Your files and converted output never leave the browser. When you send feedback, we store your vote and anything you choose to write — nothing else.",
  },
];

/**
 * Rendered unconditionally — the prerendered HTML carries it whether the
 * accordion is open or not.
 */
export const FAQ_PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};
