import { Helmet } from "react-helmet-async";
import { Seo } from "../components/Seo";
import { MarketingLayout } from "../components/MarketingLayout";
import { faqs, buildFaqLd } from "../content/faqs";

export function FaqPage() {
  return (
    <MarketingLayout>
      <Seo
        title="FAQ — Common Questions About Notes World"
        description="Answers to common questions about Notes World: pricing, the mobile app, importing notes, privacy, tags, and AI access."
        path="/faq"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(buildFaqLd())}
        </script>
      </Helmet>
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-12">
          Frequently asked questions
        </h1>
        <dl>
          {faqs.map((f) => (
            <div key={f.q} className="mb-8">
              <dt className="text-lg font-bold mb-1.5">
                <h2 className="text-lg font-bold">{f.q}</h2>
              </dt>
              <dd className="text-[#888] leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </main>
    </MarketingLayout>
  );
}
