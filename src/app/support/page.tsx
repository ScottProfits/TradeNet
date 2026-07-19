import Link from "next/link";

export const metadata = { title: "Support — Ryzr" };

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 text-gray-300">
      <div>
        <Link href="/feed" className="text-sm text-[var(--green)] hover:underline">← Back to Ryzr</Link>
        <h1 className="text-3xl font-bold text-white mt-4">Support</h1>
        <p className="text-gray-500 text-sm mt-1">We're here to help.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Contact Us</h2>
        <p>
          For account issues, bug reports, or general questions, email us at{" "}
          <a href="mailto:Ryzrsocialnetwork@gmail.com" className="text-[var(--green)] hover:underline">
            Ryzrsocialnetwork@gmail.com
          </a>
          . We aim to respond within 1-2 business days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-white font-medium">How do I verify my trades?</h3>
            <p className="text-gray-400">Go to Settings → Broker Connections and link a supported brokerage (Tradovate, Alpaca, or NinjaTrader/Kinetick). Once connected, your trades sync automatically and display a verified badge.</p>
          </div>

          <div>
            <h3 className="text-white font-medium">Does Ryzr execute trades or give investment advice?</h3>
            <p className="text-gray-400">No. Ryzr does not place trades on your behalf and does not provide investment, financial, or trading advice. It displays trade history and P&L that you or your connected broker account report, for informational and social purposes only.</p>
          </div>

          <div>
            <h3 className="text-white font-medium">How do I delete my account?</h3>
            <p className="text-gray-400">Email us at Ryzrsocialnetwork@gmail.com from the address on your account and we'll process the deletion, including all associated trades, messages, and journal entries.</p>
          </div>

          <div>
            <h3 className="text-white font-medium">Is my broker connection secure?</h3>
            <p className="text-gray-400">Yes. Broker credentials are used only to verify trade history via read-only API access and are never shared with other users. See our <Link href="/privacy" className="text-[var(--green)] hover:underline">Privacy Policy</Link> for details.</p>
          </div>

          <div>
            <h3 className="text-white font-medium">I found a bug or have a feature request.</h3>
            <p className="text-gray-400">Email us at Ryzrsocialnetwork@gmail.com with as much detail as possible (screenshots help) and we'll take a look.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Legal</h2>
        <p className="text-gray-400">
          <Link href="/privacy" className="text-[var(--green)] hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="text-[var(--green)] hover:underline">Terms of Service</Link>
        </p>
      </section>
    </div>
  );
}
