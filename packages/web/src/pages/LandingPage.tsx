import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LANGUAGES } from "../i18n/languages";

export function LandingPage() {
  const { t, i18n } = useTranslation();

  const freeFeatures = t("pricing.free.features", {
    returnObjects: true,
  }) as string[];
  const proFeatures = t("pricing.pro.features", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans">
      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur z-10">
        <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-extrabold">
            N
          </div>
          notes-world
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="text-[#888] text-sm hover:text-white transition-colors"
          >
            {t("nav.features")}
          </a>
          <a
            href="#pricing"
            className="text-[#888] text-sm hover:text-white transition-colors"
          >
            {t("nav.pricing")}
          </a>
          {/* Language switcher */}
          <select
            value={i18n.resolvedLanguage}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="text-xs bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] rounded px-2 py-1 hover:border-[#444] focus:outline-none focus:border-accent transition-colors cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <Link
            to="/login"
            className="text-sm text-[#888] border border-[#2a2a2a] px-4 py-1.5 rounded-lg hover:text-white hover:border-[#444] transition-colors"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold bg-accent text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center px-6 pt-20 pb-16 max-w-2xl mx-auto">
        <div className="inline-block bg-accent/10 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-6">
          {t("hero.badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          {t("hero.headline")}
          <br />
          <span className="text-accent">{t("hero.headlineAccent")}</span>
        </h1>
        <p className="text-lg text-[#888] max-w-xl mx-auto mb-10">
          {t("hero.subtitle")}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/login"
            className="bg-accent text-white font-semibold px-7 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t("hero.cta")}
          </Link>
          <a
            href="#pricing"
            className="text-[#888] border border-[#2a2a2a] px-7 py-2.5 rounded-lg hover:text-white hover:border-[#444] transition-colors"
          >
            {t("hero.ctaSecondary")}
          </a>
        </div>
      </section>

      {/* APP PREVIEW */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
          <div className="bg-[#242424] border-b border-[#2a2a2a] px-4 py-2.5 flex gap-2 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="grid grid-cols-[180px_1fr] min-h-[280px]">
            <div className="border-r border-[#2a2a2a] p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] pt-1 pb-1">
                Tags
              </p>
              {[
                { color: "#7c6aff", name: "Work", active: true },
                { color: "#4caf7d", name: "Personal" },
                { color: "#f59e0b", name: "Ideas" },
                { color: "#e05c5c", name: "Urgent" },
              ].map((tag) => (
                <div
                  key={tag.name}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${tag.active ? "bg-accent/10 text-accent" : "text-[#888]"}`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: tag.color }}
                  />
                  {tag.name}
                </div>
              ))}
            </div>
            <div className="p-4 flex flex-col gap-2">
              {[
                {
                  type: "Note",
                  color: "#7c6aff",
                  title: "Meeting notes — Q2 planning",
                  body: "Discussed roadmap priorities, confirmed timeline…",
                },
                {
                  type: "Task",
                  color: "#f59e0b",
                  title: "Review pull request #48",
                  body: "Authentication refactor, check edge cases.",
                },
                {
                  type: "Idea",
                  color: "#4caf7d",
                  title: "Add weekly digest export",
                  body: "Auto-generate a markdown summary each week.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-[#242424] border border-[#2a2a2a] rounded-lg px-4 py-3"
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: card.color }}
                  >
                    {card.type}
                  </p>
                  <p className="text-sm font-semibold text-[#f0f0f0]">
                    {card.title}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="max-w-4xl mx-auto px-6 mb-20">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-accent mb-3">
          {t("features.sectionLabel")}
        </p>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight mb-12">
          {t("features.sectionTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              { key: "tags", icon: "🏷" },
              { key: "types", icon: "📋" },
              { key: "capture", icon: "⚡" },
              { key: "import", icon: "📤" },
              { key: "mobile", icon: "📱" },
              { key: "dark", icon: "🌑" },
            ] as const
          ).map(({ key, icon }) => (
            <div
              key={key}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-lg mb-4">
                {icon}
              </div>
              <h3 className="font-bold text-sm mb-1.5">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-xs text-[#888] leading-relaxed">
                {t(`features.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="max-w-2xl mx-auto px-6 mb-20 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
          {t("pricing.sectionLabel")}
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-10">
          {t("pricing.sectionTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* Free */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">
              {t("pricing.free.name")}
            </p>
            <p className="text-4xl font-extrabold tracking-tight mb-0.5">
              {t("pricing.free.price")}{" "}
              <span className="text-sm font-normal text-[#888]">
                {t("pricing.free.period")}
              </span>
            </p>
            <p className="text-xs text-[#555] mb-5">&nbsp;</p>
            <ul className="space-y-2 mb-6">
              {freeFeatures.map((f) => (
                <li key={f} className="text-xs text-[#888] flex gap-2">
                  <span className="text-[#4caf7d] font-bold shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="block text-center text-sm font-semibold border border-[#2a2a2a] py-2 rounded-lg hover:border-[#444] hover:text-white transition-colors"
            >
              {t("pricing.free.cta")}
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-accent/10 to-[#1a1a1a] border border-accent rounded-2xl p-7 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
              {t("pricing.pro.badge")}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">
              {t("pricing.pro.name")}
            </p>
            <p className="text-4xl font-extrabold tracking-tight mb-0.5">
              {t("pricing.pro.price")}{" "}
              <span className="text-sm font-normal text-[#888]">
                {t("pricing.pro.period")}
              </span>
            </p>
            <p className="text-xs text-[#555] mb-5">{t("pricing.pro.alt")}</p>
            <ul className="space-y-2 mb-6">
              {proFeatures.map((f) => (
                <li key={f} className="text-xs text-[#888] flex gap-2">
                  <span className="text-[#4caf7d] font-bold shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="block text-center text-sm font-semibold bg-accent text-white py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("pricing.pro.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#2a2a2a] py-8 text-center text-xs text-[#555]">
        <p>
          &copy; 2026 Notes World &mdash;{" "}
          <Link
            to="/login"
            className="text-[#888] hover:text-white transition-colors"
          >
            {t("footer.signIn")}
          </Link>{" "}
          &middot;{" "}
          <a
            href="/impressum.html"
            className="text-[#888] hover:text-white transition-colors"
          >
            {t("footer.impressum")}
          </a>
        </p>
      </footer>
    </div>
  );
}
