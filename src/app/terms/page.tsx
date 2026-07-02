import Link from "next/link";

export const metadata = { title: "Terms of Service — Ryzr" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 text-gray-300">
      <div>
        <Link href="/feed" className="text-sm text-[var(--green)] hover:underline">← Back to Ryzr</Link>
        <h1 className="text-3xl font-bold text-white mt-4">Terms of Service</h1>
        <p className="text-gray-500 text-sm mt-1">Last updated: July 1, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
        <p>By accessing or using Ryzr ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including visitors, registered users, and contributors of content.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
        <p>You must be at least 18 years old to use Ryzr. By using the Service, you represent and warrant that you meet this requirement. Accounts found to belong to minors will be terminated immediately.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Not Financial Advice</h2>
        <p className="text-yellow-400 font-medium">Ryzr is a social platform for sharing trading activity. Nothing on Ryzr constitutes financial advice, investment advice, or a recommendation to buy or sell any security. All trading involves risk. Past performance shown by other traders does not guarantee future results. Always do your own research and consult a licensed financial advisor before making investment decisions.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. User Accounts</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You may not share your account or impersonate another person.</li>
          <li>You must provide accurate information when creating your account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. User Content</h2>
        <p>You retain ownership of content you post. By posting on Ryzr, you grant us a non-exclusive, royalty-free license to display and distribute that content within the platform. You agree not to post content that:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-400 mt-2">
          <li>Is false, misleading, or fraudulent (including fabricated P&L).</li>
          <li>Violates any applicable law or regulation.</li>
          <li>Infringes on any third party's intellectual property rights.</li>
          <li>Contains spam, harassment, hate speech, or explicit material.</li>
          <li>Promotes pump-and-dump schemes or market manipulation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Prohibited Activities</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>Posting fabricated or manipulated trading results.</li>
          <li>Using the platform to solicit funds or manage others' money without proper licensing.</li>
          <li>Scraping, crawling, or automated access to the platform.</li>
          <li>Attempting to hack, disrupt, or gain unauthorized access to the Service.</li>
          <li>Creating multiple accounts to evade a ban.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. P&L Verification</h2>
        <p>Ryzr offers optional P&L verification features. Verified badges indicate that a trade has been reviewed against brokerage data. Unverified trades are self-reported and have not been independently confirmed. We do not guarantee the accuracy of any trade data posted on the platform.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Intellectual Property</h2>
        <p>The Ryzr name, logo, and all platform code and design are owned by Ryzr. You may not copy, reproduce, or distribute any part of the platform without written permission.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. Disclaimers</h2>
        <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, accuracy of data, or fitness for any particular purpose. Market data displayed on Ryzr may be delayed and should not be used for time-sensitive trading decisions.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Ryzr shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any trading losses incurred based on content viewed on the platform.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">11. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for violation of these terms. You may delete your account at any time by contacting us at <a href="mailto:RyzrSocialNetwork@gmail.com" className="text-[var(--green)] hover:underline">RyzrSocialNetwork@gmail.com</a>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">12. Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of Ryzr after changes are posted constitutes acceptance of the new terms. We will notify users of material changes via the app or email.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">13. Governing Law</h2>
        <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved in the applicable courts of the United States.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">14. Contact</h2>
        <p>Questions about these Terms? Contact us at <a href="mailto:RyzrSocialNetwork@gmail.com" className="text-[var(--green)] hover:underline">RyzrSocialNetwork@gmail.com</a>.</p>
      </section>

      <div className="border-t border-[var(--border)] pt-6 flex items-center justify-between">
        <p className="text-gray-600 text-sm">© 2026 Ryzr. All rights reserved.</p>
        <Link href="/privacy" className="text-xs text-[var(--green)] hover:underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
