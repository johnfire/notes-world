import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans">
      <Seo
        title="Privacy Policy · Notes World"
        description="How Notes World collects, uses, and protects your data."
        path="/privacy"
      />
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
          Privacy Policy
        </h1>
        <p className="text-[#555] text-sm mb-10">Last updated: 25 May 2026</p>

        <div className="space-y-8 text-sm text-[#ccc] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">
              1. Controller
            </h2>
            <p>
              The controller responsible for processing your personal data is:
            </p>
            <p className="mt-2 text-[#aaa]">
              Christopher Rehm
              <br />
              E-Mail:{" "}
              <a
                href="mailto:car2187bus@pm.me"
                className="text-accent hover:underline"
              >
                car2187bus@pm.me
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              2. Data we collect
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[#aaa]">
              <li>
                <strong className="text-[#ccc]">Account data:</strong> your
                email address and a bcrypt hash of your password.
              </li>
              <li>
                <strong className="text-[#ccc]">Content:</strong> notes, tasks,
                ideas, reminders, tags, and any other items you create inside
                the app.
              </li>
              <li>
                <strong className="text-[#ccc]">Technical data:</strong> IP
                address (in server access logs, retained up to 7 days), browser
                or app version.
              </li>
              <li>
                <strong className="text-[#ccc]">
                  Payment data (Pro plan):
                </strong>{" "}
                billing is handled entirely by Stripe. We never see or store
                full card numbers. We receive a Stripe customer ID and
                subscription status.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              3. Purpose and legal basis
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[#aaa]">
              <li>
                Providing the service (Art. 6(1)(b) GDPR — performance of a
                contract).
              </li>
              <li>
                Fraud prevention and security (Art. 6(1)(f) GDPR — legitimate
                interest).
              </li>
              <li>Complying with legal obligations (Art. 6(1)(c) GDPR).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              4. Data storage and retention
            </h2>
            <p>
              Your data is stored on a server in Germany (Hetzner Online GmbH).
              Account data is retained until you delete your account. Items
              moved to trash are permanently deleted after 30 days. You can
              delete your account at any time from the Account settings page,
              which erases all your data immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              5. Third-party processors
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[#aaa]">
              <li>
                <strong className="text-[#ccc]">Stripe, Inc.</strong> — payment
                processing for Pro subscriptions. Data is processed in the USA
                under Stripe's Standard Contractual Clauses. See{" "}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  stripe.com/privacy
                </a>
                .
              </li>
              <li>
                <strong className="text-[#ccc]">Hetzner Online GmbH</strong> —
                server hosting in Nuremberg, Germany. Data stays in the EU.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              6. Your rights
            </h2>
            <p>Under the GDPR you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-[#aaa]">
              <li>Access the personal data we hold about you (Art. 15).</li>
              <li>Rectify inaccurate data (Art. 16).</li>
              <li>
                Erasure ("right to be forgotten") — delete your account (Art.
                17).
              </li>
              <li>Restriction of processing (Art. 18).</li>
              <li>
                Data portability — export your data as Markdown (Art. 20).
              </li>
              <li>Object to processing (Art. 21).</li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{" "}
              <a
                href="mailto:car2187bus@pm.me"
                className="text-accent hover:underline"
              >
                car2187bus@pm.me
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              7. Supervisory authority
            </h2>
            <p>
              You have the right to lodge a complaint with a data protection
              supervisory authority. The competent authority in Germany is the
              Bayerisches Landesamt für Datenschutzaufsicht (BayLDA) or the
              supervisory authority of your EU member state of residence.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">
              8. Changes to this policy
            </h2>
            <p>
              We may update this policy. We will notify you by email of any
              material changes. Continued use of the service after the
              notification period constitutes acceptance.
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
            to="/terms"
            className="text-[#888] hover:text-white transition-colors"
          >
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}
