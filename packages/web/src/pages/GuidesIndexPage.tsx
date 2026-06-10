import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { guideList } from "../content/guides";

export function GuidesIndexPage() {
  return (
    <MarketingLayout>
      <Seo
        title="Guides — Get More From Notes World"
        description="Practical guides for getting started with Notes World: organising with tags, capturing ideas fast, unifying notes and tasks, and using AI with your notes."
        path="/guides"
      />
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          Guides
        </h1>
        <p className="text-lg text-[#888] mb-4">
          Short, practical guides to help you get the most out of Notes World —
          from organising with tags to letting an AI assistant work with your
          notes.
        </p>
        <p className="text-[#888] mb-12">
          Looking for the complete reference? See the{" "}
          <Link to="/docs" className="text-accent hover:underline">
            full user guide
          </Link>
          .
        </p>

        <ul className="flex flex-col gap-8">
          {guideList.map((g) => (
            <li key={g.slug}>
              <Link to={`/guides/${g.slug}`} className="group block">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5 text-accent group-hover:underline">
                  {g.h1}
                </h2>
                <p className="text-[#888] leading-relaxed">{g.intro}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </MarketingLayout>
  );
}
