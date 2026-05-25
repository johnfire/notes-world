import { Link } from "react-router-dom";

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur z-10">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-sm tracking-wide"
        >
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-extrabold">
            N
          </div>
          notes-world
        </Link>
        <Link
          to="/login"
          className="text-sm text-[#888] border border-[#2a2a2a] px-4 py-1.5 rounded-lg hover:text-white hover:border-[#444] transition-colors"
        >
          Sign in
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-[#555] text-sm mb-10">Last updated: 25 May 2026</p>

        <div className="space-y-8 text-sm text-[#ccc] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">
              1. About Notes World
            </h2>
            <p>
              Notes World is a personal productivity app that lets you capture
              notes, tasks, ideas, and reminders. The service is operated by
              Christopher Rehm (Germany). By creating an account you agree to
              these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              2. Your account
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[#aaa]">
              <li>You must provide a valid email address to register.</li>
              <li>
                You are responsible for keeping your password secure. Do not
                share it.
              </li>
              <li>You must be at least 16 years old to use the service.</li>
              <li>
                One account per person. No bots or automated registrations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              3. Acceptable use
            </h2>
            <p>You may not use Notes World to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-[#aaa]">
              <li>Store or distribute illegal content.</li>
              <li>Attempt to gain unauthorised access to our systems.</li>
              <li>Abuse or overload the service.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate
              these rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              4. Free and Pro plans
            </h2>
            <p>
              The Free plan is provided at no cost and may have usage limits
              (currently: up to 20 tags). The Pro plan is a paid subscription
              billed monthly or annually via Stripe. You may cancel at any time;
              you retain Pro access until the end of the billing period. No
              refunds are issued for partial periods.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              5. Your content
            </h2>
            <p>
              You own everything you create in Notes World. We do not claim any
              intellectual property rights over your content. We process it
              solely to provide the service. You can export your data at any
              time and delete your account to remove all data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              6. Service availability
            </h2>
            <p>
              We aim for high availability but do not guarantee 100% uptime. The
              service is provided "as is". We are not liable for data loss due
              to circumstances outside our control. We recommend keeping your
              own backups via the export feature.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              7. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Christopher Rehm is not
              liable for indirect, incidental, or consequential damages arising
              from your use of Notes World. Our total liability for any claim
              shall not exceed the amount you paid in the 3 months prior to the
              claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              8. Governing law
            </h2>
            <p>
              These terms are governed by the laws of the Federal Republic of
              Germany. Any disputes shall be subject to the exclusive
              jurisdiction of the courts of Germany.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              9. Changes to these terms
            </h2>
            <p>
              We may update these terms. We will notify you by email at least 14
              days before material changes take effect. Continued use after that
              date constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">10. Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a
                href="mailto:car2187bus@pm.me"
                className="text-accent hover:underline"
              >
                car2187bus@pm.me
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#2a2a2a] py-8 text-center text-xs text-[#555] mt-12">
        <p>
          &copy; 2026 Notes World &mdash;{" "}
          <Link
            to="/"
            className="text-[#888] hover:text-white transition-colors"
          >
            Home
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/privacy"
            className="text-[#888] hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
