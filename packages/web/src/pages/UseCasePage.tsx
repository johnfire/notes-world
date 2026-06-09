import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { UseCase, useCaseList } from "../content/useCases";

export function UseCasePage({ useCase }: { useCase: UseCase }) {
  const others = useCaseList.filter((u) => u.slug !== useCase.slug);
  return (
    <MarketingLayout>
      <Seo
        title={useCase.seoTitle}
        description={useCase.seoDescription}
        path={`/${useCase.slug}`}
      />
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          {useCase.h1}
        </h1>
        <p className="text-lg text-[#888] mb-12">{useCase.intro}</p>

        {useCase.sections.map((s) => (
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
          {useCase.ctaLabel}
        </Link>

        <nav className="mt-16 pt-8 border-t border-[#2a2a2a]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
            Explore more
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {others.map((u) => (
              <li key={u.slug}>
                <Link to={`/${u.slug}`} className="text-accent hover:underline">
                  {u.h1}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/faq" className="text-accent hover:underline">
                Frequently asked questions
              </Link>
            </li>
          </ul>
        </nav>
      </main>
    </MarketingLayout>
  );
}
