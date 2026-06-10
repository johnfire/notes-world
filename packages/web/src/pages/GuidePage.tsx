import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { getGuide, guideList, buildGuideJsonLd } from "../content/guides";

export function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getGuide(slug) : undefined;
  if (!guide) return <Navigate to="/guides" replace />;

  const others = guideList.filter((g) => g.slug !== guide.slug);
  return (
    <MarketingLayout>
      <Seo
        title={guide.seoTitle}
        description={guide.seoDescription}
        path={`/guides/${guide.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(buildGuideJsonLd(guide))}
        </script>
      </Helmet>
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          {guide.h1}
        </h1>
        <p className="text-lg text-[#888] mb-12">{guide.intro}</p>

        {guide.sections.map((s) => (
          <section key={s.h2} className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              {s.h2}
            </h2>
            <p className="text-[#888] leading-relaxed">{s.body}</p>
          </section>
        ))}

        <Link
          to="/login"
          className="inline-block bg-accent text-white font-semibold px-7 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          {guide.ctaLabel}
        </Link>

        <nav className="mt-16 pt-8 border-t border-[#2a2a2a]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
            More guides
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {others.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/guides/${g.slug}`}
                  className="text-accent hover:underline"
                >
                  {g.h1}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/guides" className="text-accent hover:underline">
                All guides
              </Link>
            </li>
          </ul>
        </nav>
      </main>
    </MarketingLayout>
  );
}
