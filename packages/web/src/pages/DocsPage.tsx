import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <h2 className="text-base font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-[#ccc] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Sub({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#e0e0e0] mb-1">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono text-[#a8d8a8] text-xs">
      {children}
    </code>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 text-xs font-mono text-[#a8d8a8] overflow-x-auto leading-5 whitespace-pre">
      {children}
    </pre>
  );
}

const TOC = [
  { id: "getting-started", label: "Getting Started" },
  { id: "items", label: "Notes, Tasks & Ideas" },
  { id: "tags", label: "Tags" },
  { id: "dashboard", label: "Dashboard" },
  { id: "import", label: "Importing Data" },
  { id: "plans", label: "Free vs Pro" },
  { id: "api-keys", label: "API Keys" },
  { id: "mcp", label: "MCP Server (AI Agents)" },
];

export function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans">
      <Seo
        title="Documentation · Notes World"
        description="Guides and reference for using Notes World — capture, tags, views, and the MCP server for AI access."
        path="/docs"
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

      <div className="max-w-4xl mx-auto px-6 py-12 flex gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#555] mb-3">
              Contents
            </p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-sm text-[#888] hover:text-white transition-colors py-0.5"
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              User Guide
            </h1>
            <p className="text-[#666] text-sm">
              Everything you need to know about notes-world.
            </p>
          </div>

          {/* ── Getting Started ───────────────────────────── */}
          <Section id="getting-started" title="Getting Started">
            <Sub title="Create an account">
              <p>
                Go to{" "}
                <Link
                  to="/login?mode=register"
                  className="text-accent hover:underline"
                >
                  the register page
                </Link>{" "}
                and enter your email and a password. You must agree to the Terms
                of Service and Privacy Policy to sign up. Your account starts on
                the free plan.
              </p>
            </Sub>
            <Sub title="Sign in">
              <p>
                Use your email and password at the{" "}
                <Link to="/login" className="text-accent hover:underline">
                  login page
                </Link>
                . You stay signed in for 30 days without any action. Use the eye
                icon in the password field to reveal what you typed.
              </p>
            </Sub>
            <Sub title="Quick Capture">
              <p>
                The bar at the top of the dashboard lets you capture anything
                instantly — just type and press Enter. New items land in your
                inbox as untyped captures. You can promote them to a specific
                type later.
              </p>
            </Sub>
          </Section>

          {/* ── Items ─────────────────────────────────────── */}
          <Section id="items" title="Notes, Tasks & Ideas">
            <p>
              Everything you capture is an{" "}
              <strong className="text-white">item</strong>. Items start as
              untyped captures and can be promoted to one of four types. You can
              always edit the title and body of any item by clicking on it.
            </p>

            <Sub title="Item types">
              <ul className="space-y-2 list-none">
                <li>
                  <span className="text-white font-medium">Note</span> — plain
                  reference content. No status, no expiry. Good for
                  documentation, recipes, links, anything you want to keep.
                </li>
                <li>
                  <span className="text-white font-medium">Task</span> —
                  something to do. Has a status (Open → In Progress → Done) and
                  an optional priority (Low / Normal / High / Critical). Can be
                  marked blocked when waiting on something else.
                </li>
                <li>
                  <span className="text-white font-medium">Idea</span> — a
                  thought you want to develop. Has a maturity level (Seed →
                  Developing → Ready → Parked).
                </li>
                <li>
                  <span className="text-white font-medium">Reminder</span> — an
                  item with a due date. Overdue reminders surface on your
                  dashboard.
                </li>
              </ul>
            </Sub>

            <Sub title="Archiving & trash">
              <p>
                Archiving an item moves it to the trash. Items in the trash are
                kept for 30 days, then purged automatically. You can restore any
                trashed item before it expires, or delete it permanently
                immediately.
              </p>
            </Sub>

            <Sub title="Colors">
              <p>
                You can assign a color to any item for visual grouping. Colors
                appear as a left border stripe in list views.
              </p>
            </Sub>
          </Section>

          {/* ── Tags ──────────────────────────────────────── */}
          <Section id="tags" title="Tags">
            <p>
              Tags are the primary way to organize items. An item can have any
              number of tags, and a tag can hold any number of items.
            </p>

            <Sub title="Creating tags">
              <p>
                Open the tag panel from the sidebar. Type a name and press Enter
                to create a new tag. Tags can have an optional color to help you
                distinguish them at a glance.
              </p>
            </Sub>

            <Sub title="Tagging items">
              <p>
                Open any item and use the tag picker to add or remove tags. You
                can also drag items between tag views in the dashboard.
              </p>
            </Sub>

            <Sub title="Tag views">
              <p>
                Clicking a tag in the sidebar shows all items with that tag. You
                can drag items within a tag view to set a custom sort order —
                this order is saved per tag.
              </p>
            </Sub>

            <Sub title="Free plan limit">
              <p>
                Free accounts can create up to 3 tags. Upgrade to Pro for
                unlimited tags.
              </p>
            </Sub>
          </Section>

          {/* ── Dashboard ─────────────────────────────────── */}
          <Section id="dashboard" title="Dashboard">
            <p>
              The dashboard is your home view. It shows configurable blocks
              arranged in a grid. You can add, remove, and reorder blocks to
              suit your workflow.
            </p>

            <Sub title="Block types">
              <ul className="space-y-2 list-none">
                <li>
                  <span className="text-white font-medium">Quick Capture</span>{" "}
                  — fast input bar, always at hand.
                </li>
                <li>
                  <span className="text-white font-medium">Recent Items</span> —
                  the last N items you touched, across all types.
                </li>
                <li>
                  <span className="text-white font-medium">Tag Cloud</span> —
                  all your tags with item counts.
                </li>
                <li>
                  <span className="text-white font-medium">Items by Tag</span> —
                  a filtered list pinned to a specific tag.
                </li>
                <li>
                  <span className="text-white font-medium">
                    Actionable Tasks
                  </span>{" "}
                  — open and in-progress tasks, sorted by priority.
                </li>
                <li>
                  <span className="text-white font-medium">Overdue</span> —
                  reminders whose due date has passed.
                </li>
                <li>
                  <span className="text-white font-medium">Blocked Tasks</span>{" "}
                  — tasks waiting on something else.
                </li>
              </ul>
            </Sub>
          </Section>

          {/* ── Import ────────────────────────────────────── */}
          <Section id="import" title="Importing Data">
            <p>
              You can import notes from Markdown files. Notes-world understands
              a simple format: each <Code># Heading</Code> becomes the title of
              a new item, and the text below it becomes the body.
            </p>
            <p>
              Go to <strong className="text-white">Settings → Import</strong> to
              upload a file or paste content. You can optionally specify an
              auto-tag that will be applied to every imported item, which makes
              it easy to find them afterwards.
            </p>
            <p>
              For folder imports (e.g. an Obsidian vault), select multiple files
              at once — each file becomes one item, with the filename as the
              title.
            </p>
          </Section>

          {/* ── Plans ─────────────────────────────────────── */}
          <Section id="plans" title="Free vs Pro">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 text-[#666] font-medium w-1/2">
                      Feature
                    </th>
                    <th className="pb-2 text-[#666] font-medium">Free</th>
                    <th className="pb-2 text-accent font-medium">Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {[
                    ["Items", "Unlimited", "Unlimited"],
                    ["Tags", "Up to 3", "Unlimited"],
                    ["Dashboard blocks", "Up to 3", "Unlimited"],
                    ["Import", "Yes", "Yes"],
                    ["API keys & MCP", "Yes", "Yes"],
                    ["Priority support", "—", "Yes"],
                    ["14-day free trial", "—", "Yes"],
                  ].map(([feature, free, pro]) => (
                    <tr key={feature as string}>
                      <td className="py-2 text-[#ccc]">{feature}</td>
                      <td className="py-2 text-[#888]">{free}</td>
                      <td className="py-2 text-[#ccc]">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Pro costs <strong className="text-white">€5/month</strong> or{" "}
              <strong className="text-white">€45/year</strong> (save 25%). You
              can upgrade from your account settings. Payments are handled by
              Stripe — cancel anytime from the billing portal.
            </p>
          </Section>

          {/* ── API Keys ──────────────────────────────────── */}
          <Section id="api-keys" title="API Keys">
            <p>
              API keys let external tools (scripts, AI agents, automation)
              access your notes-world data on your behalf without needing your
              password.
            </p>

            <Sub title="Generating a key">
              <ol className="list-decimal list-inside space-y-1 text-[#ccc]">
                <li>
                  Open your{" "}
                  <strong className="text-white">Account settings</strong>{" "}
                  (click your avatar or the account button in the sidebar).
                </li>
                <li>
                  Scroll to the <strong className="text-white">API Keys</strong>{" "}
                  section.
                </li>
                <li>
                  Give the key a name (e.g.{" "}
                  <em className="text-[#aaa]">Claude Code</em>) and click{" "}
                  <strong className="text-white">Generate</strong>.
                </li>
                <li>
                  <strong className="text-white">
                    Copy the key immediately
                  </strong>{" "}
                  — it is shown only once and cannot be retrieved again. If you
                  lose it, revoke it and generate a new one.
                </li>
              </ol>
            </Sub>

            <Sub title="Security">
              <p>
                API keys are stored as SHA-256 hashes — even if the database
                were compromised, the raw key could not be recovered. Each key
                is scoped to your account only. You can revoke any key at any
                time from the API Keys section.
              </p>
            </Sub>
          </Section>

          {/* ── MCP ───────────────────────────────────────── */}
          <Section id="mcp" title="MCP Server (AI Agents)">
            <p>
              Notes-world ships an{" "}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                MCP
              </a>{" "}
              server so AI assistants like{" "}
              <strong className="text-white">Claude Code</strong> or{" "}
              <strong className="text-white">Cursor</strong> can read and write
              your notes directly inside their context window.
            </p>

            <Sub title="Prerequisites">
              <ul className="list-disc list-inside space-y-1">
                <li>Node.js 20 or later installed locally</li>
                <li>
                  The <Code>packages/mcp</Code> package built (
                  <Code>npm run build --workspace=packages/mcp</Code>)
                </li>
                <li>A notes-world API key (see above)</li>
              </ul>
            </Sub>

            <Sub title="Configuration">
              <p>
                Add the following to your MCP client config (e.g.{" "}
                <Code>~/.cursor/mcp.json</Code> or Claude Code's{" "}
                <Code>~/.claude/claude_code_config.json</Code>):
              </p>
              <Block>{`{
  "mcpServers": {
    "notes-world": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.js"],
      "env": {
        "NOTES_WORLD_API_URL": "https://notes-world.christopherrehm.de",
        "NOTES_WORLD_API_KEY": "nw_your_key_here"
      }
    }
  }
}`}</Block>
              <p>
                Replace <Code>/path/to/packages/mcp/dist/index.js</Code> with
                the actual path on your machine, and{" "}
                <Code>nw_your_key_here</Code> with the key you generated.
              </p>
            </Sub>

            <Sub title="Available tools">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 text-[#666] font-medium pr-4">
                        Tool
                      </th>
                      <th className="pb-2 text-[#666] font-medium">
                        What it does
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {[
                      [
                        "create_item",
                        "Create a new note, task, idea, or untyped capture",
                      ],
                      ["get_item", "Get a single item by its ID"],
                      [
                        "update_item",
                        "Edit the title, body, or color of an item",
                      ],
                      [
                        "promote_item",
                        "Promote an untyped item to Note, Task, Idea, or Reminder",
                      ],
                      ["archive_item", "Move an item to the trash"],
                      ["restore_item", "Restore a trashed item"],
                      [
                        "get_recent_items",
                        "Get the most recently updated items",
                      ],
                      ["get_trash", "List trashed items"],
                      ["list_tasks", "List all tasks with status and priority"],
                      ["start_task", "Move a task to In Progress"],
                      ["complete_task", "Mark a task as done"],
                      ["block_task", "Mark a task as blocked"],
                      ["list_ideas", "List all ideas with maturity level"],
                      ["list_notes", "List all notes"],
                      ["list_tags", "List all tags with item counts"],
                      ["create_tag", "Create a new tag"],
                      ["rename_tag", "Rename a tag"],
                      ["delete_tag", "Delete a tag entirely"],
                      ["tag_item", "Add a tag to an item"],
                      ["untag_item", "Remove a tag from an item"],
                      [
                        "get_items_for_tag",
                        "Get all items with a specific tag",
                      ],
                      ["get_tags_for_item", "Get all tags on a specific item"],
                      ["search_items", "Full-text search across all items"],
                      ["export_tag", "Export all items in a tag as Markdown"],
                      [
                        "export_untagged",
                        "Export all untagged items as Markdown",
                      ],
                    ].map(([tool, desc]) => (
                      <tr key={tool as string}>
                        <td className="py-1.5 font-mono text-[#a8d8a8] pr-4 whitespace-nowrap">
                          {tool}
                        </td>
                        <td className="py-1.5 text-[#aaa]">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Sub>
          </Section>

          <p className="text-[#444] text-xs pt-4 border-t border-[#1a1a1a]">
            Questions?{" "}
            <a
              href="mailto:car2187bus@pm.me"
              className="text-accent hover:underline"
            >
              Contact support
            </a>{" "}
            ·{" "}
            <Link to="/privacy" className="hover:text-[#888] transition-colors">
              Privacy
            </Link>{" "}
            ·{" "}
            <Link to="/terms" className="hover:text-[#888] transition-colors">
              Terms
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
