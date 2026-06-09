import { Helmet } from "react-helmet-async";

const SITE_URL = "https://notes-world.christopherrehm.de";

interface SeoProps {
  title: string;
  description: string;
  /** Route path beginning with "/" — used for the self-referencing canonical. */
  path: string;
}

/**
 * Per-route SEO meta. Sets a distinct title, description, and self-referencing
 * canonical so each public page is indexed on its own terms (the static tags in
 * index.html only describe the homepage). Googlebot renders JS, so these are
 * picked up for search snippets.
 */
export function Seo({ title, description, path }: SeoProps) {
  const canonical = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
    </Helmet>
  );
}
