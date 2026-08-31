import { useState } from "react";
import { FAQ_ITEMS, FAQ_PAGE_LD } from "@/seo/faqContent";

/**
 * Collapsed-by-default accordion under the converter (spec: SEO — FAQ).
 * Every answer is rendered into the DOM at load; the click only toggles
 * visibility — never mounted-on-click, never display:none without an
 * affordance — so the prerendered shell carries the full copy for crawlers.
 */
export function Faq() {
  const [open, setOpen] = useState(false);
  return (
    <section
      data-testid="faq"
      aria-label="How it works and frequently asked questions"
      className="flex-shrink-0 border-t border-border bg-panel px-4"
    >
      <button
        type="button"
        data-testid="faq-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden="true" className="w-3 text-center">
          {open ? "▾" : "▸"}
        </span>
        How it works &amp; FAQ
      </button>
      <div
        data-testid="faq-content"
        hidden={!open}
        className="max-w-3xl pb-4 text-[13px] leading-relaxed text-muted-foreground"
      >
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="mb-3 last:mb-0">
            <h2 className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              {item.question}
            </h2>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>
      {/* FAQPage structured data (spec: SEO — structured data), derived from
          the same items the accordion renders so the markup always matches
          the visible questions. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_PAGE_LD) }}
      />
    </section>
  );
}
