export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "What is Notes World?",
    a: "Notes World is a personal productivity app that keeps your notes, ideas, tasks, and reminders in one place. You tag everything and find anything fast. It is an actively developed prototype in daily use.",
  },
  {
    q: "Is Notes World free?",
    a: "Yes. There is a free plan that covers everyday note-taking, tasks, and reminders. A Pro plan adds higher limits for people who want more.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. Besides the web app there is a mobile app built with Expo, so you can capture notes and check reminders on the go.",
  },
  {
    q: "How is my data handled?",
    a: "Your account data is private to you. See the Privacy Policy for the full details on what is stored and how it is used.",
  },
  {
    q: "Can I import my existing notes?",
    a: "Yes. Notes World can import Markdown files, so you can bring across notes you already keep in plain text.",
  },
  {
    q: "Can an AI assistant access my notes?",
    a: "Yes. Notes World ships an MCP server, so AI agents you authorize can read and create items on your behalf through a secure connection.",
  },
  {
    q: "How do tags work?",
    a: "Every item can carry one or more colored tags. You filter by tag to pull up just your work notes, just your ideas, or whatever slice you need.",
  },
];

export function buildFaqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
