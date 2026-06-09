export interface UseCaseSection {
  h2: string;
  body: string;
}

export interface UseCase {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  sections: UseCaseSection[];
  ctaLabel: string;
}

export const useCaseList: UseCase[] = [
  {
    slug: "notes-app",
    seoTitle: "Note-Taking App — Keep Every Idea in One Place | Notes World",
    seoDescription:
      "Notes World is a fast, tag-based note-taking app. Capture ideas in seconds, organise them with colored tags, and find any note instantly. Free to start.",
    h1: "A note-taking app that keeps every idea in one place",
    intro:
      "Notes World is a clean, fast note-taking app for people who think in fragments. Jot something down in seconds, tag it, and trust that you can find it again — no folders to fuss over, no clutter to wade through.",
    sections: [
      {
        h2: "Capture notes the moment they happen",
        body: "Quick capture means a thought goes from your head into Notes World in a couple of keystrokes. There is nothing to set up first — start typing and it is saved.",
      },
      {
        h2: "Organise with tags, not folders",
        body: "Give each note one or more colored tags. Filter by a tag to see just your work notes, just your reading list, or whatever slice you need right now.",
      },
      {
        h2: "Find anything in seconds",
        body: "Everything you have ever written lives in one searchable place. Combined with tags, that means the note you half-remember is always a quick filter away.",
      },
    ],
    ctaLabel: "Start taking notes",
  },
  {
    slug: "task-manager",
    seoTitle: "Task Manager — Track To-Dos Alongside Your Notes | Notes World",
    seoDescription:
      "Manage tasks where your notes already live. Notes World lets you turn ideas into to-dos, tag them, and keep everything you are working on in one view. Free to start.",
    h1: "A task manager that lives next to your notes",
    intro:
      "Most to-dos start life as a note. Notes World keeps tasks and notes in the same place, so the idea you captured this morning becomes the task you finish this afternoon — without copying anything between apps.",
    sections: [
      {
        h2: "Turn ideas into tasks",
        body: "Anything you capture can become a task. Your notes and your to-dos stay together instead of scattered across separate tools.",
      },
      {
        h2: "Tag and filter your work",
        body: "Tag tasks the same way you tag notes. Pull up everything tagged 'urgent', or everything for a given project, in one click.",
      },
      {
        h2: "See what is in front of you",
        body: "A focused task view shows what is open so you can act on it, while the rest of your notes stay one filter away.",
      },
    ],
    ctaLabel: "Start managing tasks",
  },
  {
    slug: "reminders",
    seoTitle: "Reminders App — Never Lose a Follow-Up | Notes World",
    seoDescription:
      "Set reminders on the notes and tasks that matter. Notes World keeps your follow-ups with the context they belong to, on web and mobile. Free to start.",
    h1: "A reminders app that keeps the context",
    intro:
      "A reminder with no context is just a nag. Notes World attaches reminders to the note or task they belong to, so when one surfaces you already know exactly what it is about and what to do next.",
    sections: [
      {
        h2: "Reminders attached to real context",
        body: "Set a reminder on the actual note or task, not on a bare line of text. When it fires, the full context comes with it.",
      },
      {
        h2: "On your phone and your desktop",
        body: "With the web app and the mobile app sharing one account, your reminders follow you between devices.",
      },
      {
        h2: "Part of the same system",
        body: "Reminders are not a separate silo. They live alongside the notes and tasks you already keep, so nothing falls through the cracks.",
      },
    ],
    ctaLabel: "Start setting reminders",
  },
];

export const useCases: Record<string, UseCase> = Object.fromEntries(
  useCaseList.map((u) => [u.slug, u]),
);
