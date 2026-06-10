export interface GuideSection {
  h2: string;
  body: string;
}

export interface Guide {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  datePublished: string; // ISO date (YYYY-MM-DD)
  ctaLabel: string;
}

export const guideList: Guide[] = [
  {
    slug: "organise-notes-with-tags",
    seoTitle:
      "How to Organise Notes With Tags (Instead of Folders) | Notes World",
    seoDescription:
      "A simple system for organising notes with tags instead of folders. Learn why tags scale better, how to pick good tags, and how to find any note in seconds.",
    h1: "How to organise notes with tags instead of folders",
    intro:
      "Folders force every note into exactly one place, and you have to guess that place correctly the moment you write it. Tags don't. Here is a calm, low-effort way to keep notes organised with tags so you can always find things again.",
    sections: [
      {
        h2: "Why tags beat folders",
        body: "A note about a client call could belong in Work, in Clients, or in Calls. With folders you pick one and hope you remember it later. With tags you add all three and stop guessing. Tags let one note live in many places at once, which is how your brain actually files things.",
      },
      {
        h2: "Start with a handful of broad tags",
        body: "Don't design a perfect system up front. Begin with four or five broad tags that match the big areas of your life — work, personal, ideas, reading. Add more specific tags only when you notice yourself wanting them. A tag earns its place by being used.",
      },
      {
        h2: "Tag as you capture, not later",
        body: "The best moment to tag a note is the second you write it, while you still know what it is about. In Notes World you add colored tags inline, so tagging is a couple of keystrokes rather than a chore you save for a tidy-up that never comes.",
      },
      {
        h2: "Find anything by filtering",
        body: "Once notes are tagged, finding them is just filtering. Click a tag to see only those notes, or combine a tag with search to narrow further. The note you half-remember is always one or two clicks away — no folder spelunking required.",
      },
    ],
    datePublished: "2026-06-10",
    ctaLabel: "Try tagging in Notes World",
  },
  {
    slug: "capture-ideas-fast",
    seoTitle: "How to Capture Ideas Fast Before You Forget Them | Notes World",
    seoDescription:
      "Ideas vanish in seconds. Learn a frictionless capture habit — one inbox, no setup, organise later — so you never lose a good thought again.",
    h1: "How to capture ideas fast before you forget them",
    intro:
      "Good ideas are fragile. They show up while you're in the shower, on a walk, or mid-conversation, and they're gone again in under a minute. The trick to keeping them isn't a clever system — it's removing every scrap of friction between the thought and a saved note.",
    sections: [
      {
        h2: "Capture first, organise later",
        body: "The single biggest mistake is trying to file an idea while capturing it. Deciding the right tag or folder takes time you don't have, so the idea escapes. Get it written down first; sorting it out can wait until you have a quiet moment.",
      },
      {
        h2: "Keep one inbox, not five apps",
        body: "If thoughts land in a notes app, a chat to yourself, a sticky note, and your email drafts, half of them are effectively lost. Pick one place everything goes. In Notes World, quick capture drops a new item in with no type or tag required — you can promote it to a task or note afterwards.",
      },
      {
        h2: "Make capture a two-second action",
        body: "The faster capture is, the more you'll trust it, and the more you trust it the more you'll use it. Aim for: open, type, done. No mandatory fields, no 'choose a notebook' step. Speed is what turns capturing into a habit instead of an intention.",
      },
      {
        h2: "Review your inbox on your own schedule",
        body: "A pile of raw captures isn't mess — it's raw material. Once a day or once a week, run down the list: bin what's stale, tag what's worth keeping, and turn the actionable ones into tasks. The capture step stays fast precisely because the thinking happens later.",
      },
    ],
    datePublished: "2026-06-10",
    ctaLabel: "Start capturing ideas",
  },
  {
    slug: "notes-tasks-reminders-one-app",
    seoTitle:
      "Notes, Tasks, and Reminders in One App (Not Three) | Notes World",
    seoDescription:
      "Juggling a notes app, a to-do app, and a reminders app means things fall through the cracks. Here's why one connected place works better — and how to set it up.",
    h1: "Notes, tasks, and reminders in one app (not three)",
    intro:
      "Most people run a notes app, a separate to-do app, and the phone's reminders — three silos that never talk to each other. A task buried in a note never becomes a real to-do, and a reminder with no context is just a nagging beep. Keeping everything in one connected place fixes that.",
    sections: [
      {
        h2: "The problem with three separate apps",
        body: "When your notes, tasks, and reminders live apart, the connections between them are lost. You write a meeting note with three action items, but those items stay trapped in the note. You set a reminder, but it can't point back to the thing it's about. The gaps between apps are exactly where work slips through.",
      },
      {
        h2: "One item, many shapes",
        body: "In Notes World everything starts as a single kind of item. A quick capture can become a note, an idea, a task, or a reminder — and change later as your understanding does. A stray thought becomes an idea becomes a task without being re-typed into a different app.",
      },
      {
        h2: "Tasks and reminders keep their context",
        body: "Because a task lives next to the note it came from, opening it shows the full picture, not a bare line of text. Set a reminder on the actual item and, when it fires, the context comes with it. Nothing is stranded.",
      },
      {
        h2: "One place to look",
        body: "The quiet benefit of unifying is that there's a single place to check. You're not scanning three apps and hoping you didn't miss something in the fourth. Tags, priorities, and dependencies tie it together, so the whole picture is in one view.",
      },
    ],
    datePublished: "2026-06-10",
    ctaLabel: "Put it all in one place",
  },
  {
    slug: "use-ai-with-your-notes",
    seoTitle: "How to Use AI With Your Notes via MCP | Notes World",
    seoDescription:
      "Connect an AI assistant like Claude to your notes with MCP. Learn what the Model Context Protocol is, what it lets an assistant do, and how to keep it secure.",
    h1: "How to use AI with your notes via MCP",
    intro:
      "Copy-pasting your notes into a chatbot every time you want help is slow and leaky. A better way is to let an AI assistant work with your notes directly — securely, and only when you ask. Notes World does this through MCP, the Model Context Protocol.",
    sections: [
      {
        h2: "What MCP is, briefly",
        body: "MCP (Model Context Protocol) is an open standard that lets AI assistants connect to external tools and data through a defined, permissioned interface. Instead of pasting context into a chat, the assistant talks to a small server that exposes specific actions — and nothing more.",
      },
      {
        h2: "What an assistant can do with your notes",
        body: "Notes World ships an MCP server, so an assistant you authorize can search your items, read a note, create new ones, and turn captures into tasks. That unlocks things like 'summarise what I captured this week', 'turn these notes into a task list', or 'what's currently blocked?' — working from your real data.",
      },
      {
        h2: "You stay in control",
        body: "The assistant only reaches your notes through the MCP connection you set up, and only does the specific actions the server exposes. It isn't given your password or free run of your account — it's a narrow, revocable door, not a master key.",
      },
      {
        h2: "Getting started",
        body: "Connect Notes World's MCP server to an MCP-capable client such as Claude. Once it's linked, you can ask the assistant about your notes in plain language and let it do the fetching and filing. The setup details live in the project documentation.",
      },
    ],
    datePublished: "2026-06-10",
    ctaLabel: "Try Notes World",
  },
];

export const guides: Record<string, Guide> = Object.fromEntries(
  guideList.map((g) => [g.slug, g]),
);

export function getGuide(slug: string): Guide | undefined {
  return guides[slug];
}

export function buildGuideJsonLd(guide: Guide) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.seoDescription,
    datePublished: guide.datePublished,
    author: { "@type": "Organization", name: "Notes World" },
    publisher: { "@type": "Organization", name: "Notes World" },
    mainEntityOfPage: `https://notes-world.christopherrehm.de/guides/${guide.slug}`,
  };
}
