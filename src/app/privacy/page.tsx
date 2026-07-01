import Link from "next/link";

export const metadata = { title: "Privacy Policy — Ryzr" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 text-gray-300">
      <div>
        <Link href="/feed" className="text-sm text-[var(--green)] hover:underline">← Back to Ryzr</Link>
        <h1 className="text-3xl font-bold text-white mt-4">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mt-1">Last updated: July 1, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
        <p>Ryzr ("we", "our", or "us") operates the Ryzr social trading platform accessible at ryzr.app. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li><span className="text-gray-300 font-medium">Account information</span> — name, email address, username, and profile photo provided during sign-up via Clerk.</li>
          <li><span className="text-gray-300 font-medium">Trading data</span> — trade details (ticker, P&L, direction, notes) that you voluntarily post to the platform.</li>
          <li><span className="text-gray-300 font-medium">Social activity</span> — follows, likes, comments, and direct messages between users.</li>
          <li><span className="text-gray-300 font-medium">Device information</span> — browser type, device type, and push notification tokens (if you opt in).</li>
          <li><span className="text-gray-300 font-medium">Usage data</span> — pages visited and features used, collected to improve the app.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>To provide, operate, and improve the Ryzr platform.</li>
          <li>To display your public profile and trades to other users.</li>
          <li>To send push notifications for activity on your account (likes, comments, follows, messages) — only if you opt in.</li>
          <li>To detect and prevent fraud or abuse.</li>
          <li>To communicate service updates and important notices.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Information Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-400 mt-2">
          <li><span className="text-gray-300 font-medium">Clerk</span> — authentication provider that manages sign-in and account security.</li>
          <li><span className="text-gray-300 font-medium">Supabase</span> — database provider that stores your profile and trading data.</li>
          <li><span className="text-gray-300 font-medium">Vercel</span> — hosting provider that serves the app.</li>
          <li>Law enforcement or regulators when required by law.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Public vs. Private Data</h2>
        <p>Trades, comments, and profile information you post are <span className="text-white font-medium">public</span> and visible to all users. Direct messages are <span className="text-white font-medium">private</span> and only visible to the sender and recipient. Your email address is never displayed publicly.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Push Notifications</h2>
        <p>If you grant permission, we send push notifications to your device for likes, comments, follows, and direct messages. You can revoke this permission at any time in your device settings.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Data Retention</h2>
        <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us at <a href="mailto:Ajthornton01@yahoo.com" className="text-[var(--green)] hover:underline">Ajthornton01@yahoo.com</a>. We will process deletion requests within 30 days.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Children's Privacy</h2>
        <p>Ryzr is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has created an account, please contact us and we will delete it promptly.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">9. Security</h2>
        <p>We use industry-standard security measures including encrypted connections (HTTPS), secure authentication via Clerk, and access controls on our database. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">10. Your Rights</h2>
        <p>Depending on your location, you may have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:Ajthornton01@yahoo.com" className="text-[var(--green)] hover:underline">Ajthornton01@yahoo.com</a>.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify users of significant changes via the app or email. Continued use of Ryzr after changes constitutes acceptance of the updated policy.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">12. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, contact us at:</p>
        <p className="text-[var(--green)]">Ajthornton01@yahoo.com</p>
      </section>

      <div className="border-t border-[var(--border)] pt-6 text-center">
        <p className="text-gray-600 text-sm">© 2026 Ryzr. All rights reserved.</p>
      </div>
    </div>
  );
}
