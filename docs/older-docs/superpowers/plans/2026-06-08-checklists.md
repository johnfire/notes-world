# Checklists (Shopping Lists) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "checklist" feature — named lists of simple items each with a checkbox (`checked` = "got it", default unchecked = "still need it") — across the server API, web app, mobile app, and MCP server, then produce a signed Android AAB.

**Architecture:** New backend domain `checklists` (controller/service/repository) backed by two tables (`checklists`, `checklist_items`), fully separate from the items/tags universe. A single router mounted at `/api/checklists` with nested item routes. Web adds a "Checklists" ViewBar tab + master-detail component; mobile adds a tab + detail screen; MCP adds a tool set. Spec: `docs/superpowers/specs/2026-06-08-checklists-design.md`.

**Tech Stack:** Node 20, Express 4, TypeScript, PostgreSQL (raw SQL via `pg`), Jest + supertest (server tests), React 18 + Vite + Tailwind (web), React Native + Expo Router (mobile), `@modelcontextprotocol/sdk` + zod (MCP).

---

## File Structure

**Create:**

- `packages/server/src/db/migrations/016_checklists.sql` — tables
- `packages/server/src/domains/checklists/checklists.repository.ts` — SQL
- `packages/server/src/domains/checklists/checklists.service.ts` — validation + business logic
- `packages/server/src/domains/checklists/checklists.controller.ts` — HTTP handlers
- `packages/server/src/domains/checklists/checklists.routes.ts` — router
- `tests/unit/server/domains/checklists/checklists.service.test.ts` — service tests
- `tests/contract/server/domains/checklists/checklists.routes.test.ts` — route tests
- `packages/web/src/components/ChecklistsView.tsx` — web master-detail view
- `packages/mobile/src/api/checklists.ts` — mobile API client
- `packages/mobile/app/(tabs)/checklists.tsx` — mobile list screen
- `packages/mobile/app/checklist/[id].tsx` — mobile detail screen
- `packages/mcp/src/tools/checklists.ts` — MCP tools

**Modify:**

- `packages/shared/src/types/index.ts` — add `Checklist` / `ChecklistItem` types
- `packages/server/src/app.ts` — import + mount `checklistsRouter`
- `packages/web/src/api/index.ts` — add `checklists` client
- `packages/web/src/components/layout/ViewBar.tsx` — add `"checklists"` view
- `packages/web/src/App.tsx` — render `ChecklistsView` for the checklists view
- `packages/web/src/i18n/locales/en.json` — add `app.views.checklists`
- `packages/mobile/app/(tabs)/_layout.tsx` — register checklists tab
- `packages/mobile/src/i18n/locales/en.json` — add `tabs.checklists`
- `packages/mcp/src/index.ts` — import + register `registerChecklistTools`

---

## Task 1: Database migration

**Files:**

- Create: `packages/server/src/db/migrations/016_checklists.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 016: Checklists (shopping lists)
-- A checklist has a title; checklist_items each have a name and a checked flag.

CREATE TABLE checklists (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL,
  title       VARCHAR(300) NOT NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_user_id ON checklists (user_id);

CREATE TABLE checklist_items (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id  UUID         NOT NULL REFERENCES checklists (id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL,
  name          VARCHAR(300) NOT NULL,
  checked       BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist ON checklist_items (checklist_id);
```

- [ ] **Step 2: Verify it parses by starting the server (migrations auto-run)**

Run: `npm run dev --workspace=packages/server`
Expected: server boots without migration errors; log shows migration `016_checklists` applied. Stop the server (Ctrl-C) once it reports listening. (If no local Postgres is available, skip — the migration is plain SQL verified by review; it will run in CI/deploy.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/db/migrations/016_checklists.sql
git commit -m "feat(checklists): add checklists and checklist_items tables"
```

---

## Task 2: Shared types

**Files:**

- Modify: `packages/shared/src/types/index.ts` (append at end of file)

- [ ] **Step 1: Append the types**

```typescript
// ─── Checklists ──────────────────────────────────────────────────────────────

export type ChecklistId = string;

export interface ChecklistItem {
  id: string;
  checklist_id: ChecklistId;
  name: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: ChecklistId;
  user_id: UserId;
  title: string;
  sort_order: number;
  items?: ChecklistItem[]; // present on detail fetch (GET /:id)
  item_count?: number; // present on list fetch (GET /)
  checked_count?: number; // present on list fetch (GET /)
  created_at: string;
  updated_at: string;
}
```

(`UserId` is already defined earlier in this file — used by the existing `Item` interface.)

- [ ] **Step 2: Build shared so dependents typecheck against the new types**

Run: `npm run build --workspace=packages/shared`
Expected: compiles with no errors; `packages/shared/dist` updated.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/dist
git commit -m "feat(checklists): add Checklist and ChecklistItem shared types"
```

---

## Task 3: Repository

**Files:**

- Create: `packages/server/src/domains/checklists/checklists.repository.ts`

The repository follows `items.repository.ts`: raw SQL via `query`/`queryOne`, every query scoped by `user_id`, updates via `buildUpdate` (which auto-sets `updated_at = NOW()` and rejects unsafe identifiers). No standalone repository unit test — repository code is exercised through the service/contract tests, consistent with the existing `items` domain.

- [ ] **Step 1: Write the repository**

```typescript
// Checklists repository — raw SQL queries
import { Checklist, ChecklistItem, ChecklistId, UserId } from "../../types";
import { query, queryOne } from "../../db/client";
import { buildUpdate } from "../../utils/buildUpdate";

export async function listChecklists(userId: UserId): Promise<Checklist[]> {
  return query<Checklist>(
    `SELECT c.*,
       COUNT(ci.id)::int AS item_count,
       (COUNT(ci.id) FILTER (WHERE ci.checked))::int AS checked_count
     FROM checklists c
     LEFT JOIN checklist_items ci ON ci.checklist_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, LOWER(c.title) ASC`,
    [userId],
  );
}

export async function findById(
  id: ChecklistId,
  userId: UserId,
): Promise<Checklist | null> {
  return queryOne<Checklist>(
    `SELECT * FROM checklists WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function findItems(
  checklistId: ChecklistId,
  userId: UserId,
): Promise<ChecklistItem[]> {
  return query<ChecklistItem>(
    `SELECT * FROM checklist_items
     WHERE checklist_id = $1 AND user_id = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [checklistId, userId],
  );
}

export async function insertChecklist(
  userId: UserId,
  title: string,
): Promise<Checklist> {
  const rows = await query<Checklist>(
    `INSERT INTO checklists (user_id, title, sort_order)
     VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM checklists WHERE user_id = $1), 0))
     RETURNING *`,
    [userId, title],
  );
  return rows[0];
}

export async function updateChecklist(
  id: ChecklistId,
  userId: UserId,
  fields: { title?: string },
): Promise<Checklist | null> {
  const { sql, params } = buildUpdate(
    "checklists",
    fields,
    { id, user_id: userId },
    { allowedFields: ["title"] },
  );
  return queryOne<Checklist>(sql, params);
}

export async function deleteChecklist(
  id: ChecklistId,
  userId: UserId,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM checklists WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  return rows.length > 0;
}

export async function insertItem(
  checklistId: ChecklistId,
  userId: UserId,
  name: string,
): Promise<ChecklistItem> {
  const rows = await query<ChecklistItem>(
    `INSERT INTO checklist_items (checklist_id, user_id, name, sort_order)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 1 FROM checklist_items WHERE checklist_id = $1), 0))
     RETURNING *`,
    [checklistId, userId, name],
  );
  return rows[0];
}

export async function findItemById(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
): Promise<ChecklistItem | null> {
  return queryOne<ChecklistItem>(
    `SELECT * FROM checklist_items WHERE id = $1 AND checklist_id = $2 AND user_id = $3`,
    [itemId, checklistId, userId],
  );
}

export async function updateItem(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
  fields: { name?: string; checked?: boolean },
): Promise<ChecklistItem | null> {
  const { sql, params } = buildUpdate(
    "checklist_items",
    fields,
    { id: itemId, checklist_id: checklistId, user_id: userId },
    { allowedFields: ["name", "checked"] },
  );
  return queryOne<ChecklistItem>(sql, params);
}

export async function deleteItem(
  itemId: string,
  checklistId: ChecklistId,
  userId: UserId,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM checklist_items WHERE id = $1 AND checklist_id = $2 AND user_id = $3 RETURNING id`,
    [itemId, checklistId, userId],
  );
  return rows.length > 0;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build --workspace=packages/server`
Expected: compiles with no type errors. (The service/controller/routes don't exist yet, but this file only imports types + db utils, so it compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domains/checklists/checklists.repository.ts
git commit -m "feat(checklists): add checklists repository"
```

---

## Task 4: Service (TDD)

**Files:**

- Create: `tests/unit/server/domains/checklists/checklists.service.test.ts`
- Create: `packages/server/src/domains/checklists/checklists.service.ts`

- [ ] **Step 1: Write the failing service test**

```typescript
import {
  Checklist,
  ChecklistItem,
} from "../../../../../packages/server/src/types";
import { TEST_USER_ID } from "../../../../helpers/itemFactory";

// Mock the repository before importing the service
jest.mock(
  "../../../../../packages/server/src/domains/checklists/checklists.repository",
);

import * as repo from "../../../../../packages/server/src/domains/checklists/checklists.repository";
import * as service from "../../../../../packages/server/src/domains/checklists/checklists.service";

const mockRepo = repo as jest.Mocked<typeof repo>;

beforeEach(() => jest.clearAllMocks());

function makeChecklist(overrides: Partial<Checklist> = {}): Checklist {
  return {
    id: "list-1",
    user_id: TEST_USER_ID,
    title: "Groceries",
    sort_order: 0,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

function makeChecklistItem(
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id: "item-1",
    checklist_id: "list-1",
    name: "Milk",
    checked: false,
    sort_order: 0,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

describe("createChecklist", () => {
  test("creates a list with a trimmed title", async () => {
    const created = makeChecklist();
    mockRepo.insertChecklist.mockResolvedValue(created);

    const result = await service.createChecklist(TEST_USER_ID, "  Groceries  ");

    expect(mockRepo.insertChecklist).toHaveBeenCalledWith(
      TEST_USER_ID,
      "Groceries",
    );
    expect(result).toBe(created);
  });

  test("rejects an empty title", async () => {
    await expect(
      service.createChecklist(TEST_USER_ID, "   "),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.insertChecklist).not.toHaveBeenCalled();
  });

  test("rejects a title over 300 chars", async () => {
    await expect(
      service.createChecklist(TEST_USER_ID, "a".repeat(301)),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("getChecklist", () => {
  test("returns the list with its items", async () => {
    const list = makeChecklist();
    const items = [makeChecklistItem()];
    mockRepo.findById.mockResolvedValue(list);
    mockRepo.findItems.mockResolvedValue(items);

    const result = await service.getChecklist(TEST_USER_ID, "list-1");

    expect(result).toEqual({ ...list, items });
  });

  test("throws NotFound when the list does not exist", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.getChecklist(TEST_USER_ID, "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("renameChecklist", () => {
  test("renames an existing list", async () => {
    const updated = makeChecklist({ title: "Renamed" });
    mockRepo.updateChecklist.mockResolvedValue(updated);

    const result = await service.renameChecklist(
      TEST_USER_ID,
      "list-1",
      "Renamed",
    );

    expect(mockRepo.updateChecklist).toHaveBeenCalledWith(
      "list-1",
      TEST_USER_ID,
      { title: "Renamed" },
    );
    expect(result).toBe(updated);
  });

  test("throws NotFound when missing", async () => {
    mockRepo.updateChecklist.mockResolvedValue(null);
    await expect(
      service.renameChecklist(TEST_USER_ID, "missing", "x"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteChecklist", () => {
  test("deletes an existing list", async () => {
    mockRepo.deleteChecklist.mockResolvedValue(true);
    await expect(
      service.deleteChecklist(TEST_USER_ID, "list-1"),
    ).resolves.toBeUndefined();
  });

  test("throws NotFound when missing", async () => {
    mockRepo.deleteChecklist.mockResolvedValue(false);
    await expect(
      service.deleteChecklist(TEST_USER_ID, "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("addItem", () => {
  test("adds an item to an existing list", async () => {
    const list = makeChecklist();
    const item = makeChecklistItem();
    mockRepo.findById.mockResolvedValue(list);
    mockRepo.insertItem.mockResolvedValue(item);

    const result = await service.addItem(TEST_USER_ID, "list-1", "  Milk  ");

    expect(mockRepo.insertItem).toHaveBeenCalledWith(
      "list-1",
      TEST_USER_ID,
      "Milk",
    );
    expect(result).toBe(item);
  });

  test("rejects an empty name", async () => {
    await expect(
      service.addItem(TEST_USER_ID, "list-1", "  "),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.insertItem).not.toHaveBeenCalled();
  });

  test("throws NotFound when the list does not belong to the user", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.addItem(TEST_USER_ID, "missing", "Milk"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockRepo.insertItem).not.toHaveBeenCalled();
  });
});

describe("updateItem", () => {
  test("toggles checked", async () => {
    const item = makeChecklistItem({ checked: true });
    mockRepo.updateItem.mockResolvedValue(item);

    const result = await service.updateItem(TEST_USER_ID, "list-1", "item-1", {
      checked: true,
    });

    expect(mockRepo.updateItem).toHaveBeenCalledWith(
      "item-1",
      "list-1",
      TEST_USER_ID,
      { checked: true },
    );
    expect(result).toBe(item);
  });

  test("renames an item with a trimmed name", async () => {
    const item = makeChecklistItem({ name: "Oat milk" });
    mockRepo.updateItem.mockResolvedValue(item);

    await service.updateItem(TEST_USER_ID, "list-1", "item-1", {
      name: "  Oat milk  ",
    });

    expect(mockRepo.updateItem).toHaveBeenCalledWith(
      "item-1",
      "list-1",
      TEST_USER_ID,
      { name: "Oat milk" },
    );
  });

  test("rejects when no fields are provided", async () => {
    await expect(
      service.updateItem(TEST_USER_ID, "list-1", "item-1", {}),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockRepo.updateItem).not.toHaveBeenCalled();
  });

  test("throws NotFound when the item is missing", async () => {
    mockRepo.updateItem.mockResolvedValue(null);
    await expect(
      service.updateItem(TEST_USER_ID, "list-1", "missing", { checked: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deleteItem", () => {
  test("deletes an existing item", async () => {
    mockRepo.deleteItem.mockResolvedValue(true);
    await expect(
      service.deleteItem(TEST_USER_ID, "list-1", "item-1"),
    ).resolves.toBeUndefined();
  });

  test("throws NotFound when missing", async () => {
    mockRepo.deleteItem.mockResolvedValue(false);
    await expect(
      service.deleteItem(TEST_USER_ID, "list-1", "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/server -- checklists.service`
Expected: FAIL — cannot find module `checklists.service` (not created yet).

- [ ] **Step 3: Write the service**

```typescript
// Checklists domain service — validation + business logic
import { Checklist, ChecklistItem, ChecklistId, UserId } from "../../types";
import { LIMITS } from "../../constants";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./checklists.repository";

const TEXT_MAX = LIMITS.ITEM_TITLE_MAX; // 300 — shared limit for titles/names

function clean(value: string | undefined, field: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) throw new ValidationError(`${field} is required`);
  if (trimmed.length > TEXT_MAX) {
    throw new ValidationError(`${field} too long`, {
      length: trimmed.length,
      maximum: TEXT_MAX,
    });
  }
  return trimmed;
}

export async function listChecklists(userId: UserId): Promise<Checklist[]> {
  return repo.listChecklists(userId);
}

export async function getChecklist(
  userId: UserId,
  id: ChecklistId,
): Promise<Checklist> {
  const checklist = await repo.findById(id, userId);
  if (!checklist) throw new NotFoundError("Checklist", id);
  const items = await repo.findItems(id, userId);
  return { ...checklist, items };
}

export async function createChecklist(
  userId: UserId,
  title: string,
): Promise<Checklist> {
  return repo.insertChecklist(userId, clean(title, "Title"));
}

export async function renameChecklist(
  userId: UserId,
  id: ChecklistId,
  title: string,
): Promise<Checklist> {
  const updated = await repo.updateChecklist(id, userId, {
    title: clean(title, "Title"),
  });
  if (!updated) throw new NotFoundError("Checklist", id);
  return updated;
}

export async function deleteChecklist(
  userId: UserId,
  id: ChecklistId,
): Promise<void> {
  const deleted = await repo.deleteChecklist(id, userId);
  if (!deleted) throw new NotFoundError("Checklist", id);
}

export async function addItem(
  userId: UserId,
  checklistId: ChecklistId,
  name: string,
): Promise<ChecklistItem> {
  const cleanName = clean(name, "Name");
  const checklist = await repo.findById(checklistId, userId);
  if (!checklist) throw new NotFoundError("Checklist", checklistId);
  return repo.insertItem(checklistId, userId, cleanName);
}

export async function updateItem(
  userId: UserId,
  checklistId: ChecklistId,
  itemId: string,
  input: { name?: string; checked?: boolean },
): Promise<ChecklistItem> {
  const fields: { name?: string; checked?: boolean } = {};
  if (input.name !== undefined) fields.name = clean(input.name, "Name");
  if (input.checked !== undefined) {
    if (typeof input.checked !== "boolean") {
      throw new ValidationError("checked must be a boolean");
    }
    fields.checked = input.checked;
  }
  if (fields.name === undefined && fields.checked === undefined) {
    throw new ValidationError("No fields to update");
  }
  const updated = await repo.updateItem(itemId, checklistId, userId, fields);
  if (!updated) throw new NotFoundError("Checklist item", itemId);
  return updated;
}

export async function deleteItem(
  userId: UserId,
  checklistId: ChecklistId,
  itemId: string,
): Promise<void> {
  const deleted = await repo.deleteItem(itemId, checklistId, userId);
  if (!deleted) throw new NotFoundError("Checklist item", itemId);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=packages/server -- checklists.service`
Expected: PASS — all service tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/domains/checklists/checklists.service.ts tests/unit/server/domains/checklists/checklists.service.test.ts
git commit -m "feat(checklists): add checklists service with validation"
```

---

## Task 5: Controller, routes, mount (TDD via contract tests)

**Files:**

- Create: `packages/server/src/domains/checklists/checklists.controller.ts`
- Create: `packages/server/src/domains/checklists/checklists.routes.ts`
- Modify: `packages/server/src/app.ts`
- Create: `tests/contract/server/domains/checklists/checklists.routes.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
import request from "supertest";
import {
  Checklist,
  ChecklistItem,
} from "../../../../../packages/server/src/types";

jest.mock(
  "../../../../../packages/server/src/domains/checklists/checklists.service",
);
jest.mock("../../../../../packages/server/src/db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock("../../../../../packages/server/src/middleware/auth", () => ({
  requireAuth: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    req.userId = "00000000-0000-0000-0000-000000000001";
    next();
  },
}));

import * as service from "../../../../../packages/server/src/domains/checklists/checklists.service";
import { createApp } from "../../../../../packages/server/src/app";

const mockService = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

const list: Checklist = {
  id: "list-1",
  user_id: "00000000-0000-0000-0000-000000000001",
  title: "Groceries",
  sort_order: 0,
  created_at: "2026-06-08T00:00:00Z",
  updated_at: "2026-06-08T00:00:00Z",
};
const item: ChecklistItem = {
  id: "item-1",
  checklist_id: "list-1",
  name: "Milk",
  checked: false,
  sort_order: 0,
  created_at: "2026-06-08T00:00:00Z",
  updated_at: "2026-06-08T00:00:00Z",
};

describe("GET /api/checklists", () => {
  test("200 with the list of checklists", async () => {
    mockService.listChecklists.mockResolvedValue([
      { ...list, item_count: 1, checked_count: 0 },
    ]);
    const res = await request(app).get("/api/checklists");
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("Groceries");
  });
});

describe("POST /api/checklists", () => {
  test("201 with the created list", async () => {
    mockService.createChecklist.mockResolvedValue(list);
    const res = await request(app)
      .post("/api/checklists")
      .send({ title: "Groceries" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("list-1");
    expect(mockService.createChecklist).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      "Groceries",
    );
  });

  test("422 when the title is invalid", async () => {
    const { ValidationError } =
      await import("../../../../../packages/server/src/utils/errors");
    mockService.createChecklist.mockRejectedValue(
      new ValidationError("Title is required"),
    );
    const res = await request(app).post("/api/checklists").send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/checklists/:id", () => {
  test("200 with list + items", async () => {
    mockService.getChecklist.mockResolvedValue({ ...list, items: [item] });
    const res = await request(app).get("/api/checklists/list-1");
    expect(res.status).toBe(200);
    expect(res.body.items[0].name).toBe("Milk");
  });

  test("404 when missing", async () => {
    const { NotFoundError } =
      await import("../../../../../packages/server/src/utils/errors");
    mockService.getChecklist.mockRejectedValue(
      new NotFoundError("Checklist", "missing"),
    );
    const res = await request(app).get("/api/checklists/missing");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/checklists/:id", () => {
  test("200 with renamed list", async () => {
    mockService.renameChecklist.mockResolvedValue({ ...list, title: "Food" });
    const res = await request(app)
      .patch("/api/checklists/list-1")
      .send({ title: "Food" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Food");
  });
});

describe("DELETE /api/checklists/:id", () => {
  test("204 on delete", async () => {
    mockService.deleteChecklist.mockResolvedValue(undefined);
    const res = await request(app).delete("/api/checklists/list-1");
    expect(res.status).toBe(204);
  });
});

describe("POST /api/checklists/:id/items", () => {
  test("201 with the created item", async () => {
    mockService.addItem.mockResolvedValue(item);
    const res = await request(app)
      .post("/api/checklists/list-1/items")
      .send({ name: "Milk" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Milk");
    expect(mockService.addItem).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      "list-1",
      "Milk",
    );
  });
});

describe("PATCH /api/checklists/:id/items/:itemId", () => {
  test("200 toggling checked", async () => {
    mockService.updateItem.mockResolvedValue({ ...item, checked: true });
    const res = await request(app)
      .patch("/api/checklists/list-1/items/item-1")
      .send({ checked: true });
    expect(res.status).toBe(200);
    expect(res.body.checked).toBe(true);
    expect(mockService.updateItem).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      "list-1",
      "item-1",
      { name: undefined, checked: true },
    );
  });
});

describe("DELETE /api/checklists/:id/items/:itemId", () => {
  test("204 on delete", async () => {
    mockService.deleteItem.mockResolvedValue(undefined);
    const res = await request(app).delete(
      "/api/checklists/list-1/items/item-1",
    );
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/server -- checklists.routes`
Expected: FAIL — cannot find module `checklists.service` / `checklists.controller` / route not mounted.

- [ ] **Step 3: Write the controller**

```typescript
import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./checklists.service";

export const listChecklists = wrapAsync(async (req: Request, res: Response) => {
  const checklists = await service.listChecklists(req.userId);
  res.json(checklists);
});

export const getChecklist = wrapAsync(async (req: Request, res: Response) => {
  const checklist = await service.getChecklist(req.userId, req.params.id);
  res.json(checklist);
});

export const createChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    const checklist = await service.createChecklist(req.userId, req.body.title);
    res.status(201).json(checklist);
  },
);

export const renameChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    const checklist = await service.renameChecklist(
      req.userId,
      req.params.id,
      req.body.title,
    );
    res.json(checklist);
  },
);

export const deleteChecklist = wrapAsync(
  async (req: Request, res: Response) => {
    await service.deleteChecklist(req.userId, req.params.id);
    res.status(204).send();
  },
);

export const addItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.addItem(req.userId, req.params.id, req.body.name);
  res.status(201).json(item);
});

export const updateItem = wrapAsync(async (req: Request, res: Response) => {
  const item = await service.updateItem(
    req.userId,
    req.params.id,
    req.params.itemId,
    { name: req.body.name, checked: req.body.checked },
  );
  res.json(item);
});

export const deleteItem = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteItem(req.userId, req.params.id, req.params.itemId);
  res.status(204).send();
});
```

- [ ] **Step 4: Write the router**

```typescript
import { Router } from "express";
import * as ctrl from "./checklists.controller";

export const checklistsRouter = Router();

checklistsRouter.get("/", ctrl.listChecklists);
checklistsRouter.post("/", ctrl.createChecklist);
checklistsRouter.get("/:id", ctrl.getChecklist);
checklistsRouter.patch("/:id", ctrl.renameChecklist);
checklistsRouter.delete("/:id", ctrl.deleteChecklist);
checklistsRouter.post("/:id/items", ctrl.addItem);
checklistsRouter.patch("/:id/items/:itemId", ctrl.updateItem);
checklistsRouter.delete("/:id/items/:itemId", ctrl.deleteItem);
```

- [ ] **Step 5: Mount the router in `app.ts`**

Add the import alongside the other domain routers (near `packages/server/src/app.ts:8`):

```typescript
import { checklistsRouter } from "./domains/checklists/checklists.routes";
```

Add the mount in the authenticated section, immediately after the items mount (`packages/server/src/app.ts:123`):

```typescript
app.use("/api/items", itemsRouter);
app.use("/api/checklists", checklistsRouter);
```

- [ ] **Step 6: Run the contract test to verify it passes**

Run: `npm test --workspace=packages/server -- checklists.routes`
Expected: PASS — all route tests green.

- [ ] **Step 7: Run the full server test suite (coverage gate)**

Run: `npm test --workspace=packages/server`
Expected: all suites pass; global coverage stays ≥ 80%.

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/domains/checklists/checklists.controller.ts packages/server/src/domains/checklists/checklists.routes.ts packages/server/src/app.ts tests/contract/server/domains/checklists/checklists.routes.test.ts
git commit -m "feat(checklists): add checklists controller, routes, and mount"
```

---

## Task 6: Web API client

**Files:**

- Modify: `packages/web/src/api/index.ts`

- [ ] **Step 1: Add `Checklist` / `ChecklistItem` to the type import**

At the top of `packages/web/src/api/index.ts`, extend the existing import from `"../types"` (which re-exports `@notes-world/shared`) to include the new types:

```typescript
import {
  Item,
  Tag,
  DashboardResponse,
  Block,
  ViewType,
  BlockConfig,
  TypeData,
  ItemType,
  Dependency,
  ImportJob,
  ImportRecord,
  Checklist,
  ChecklistItem,
} from "../types";
```

- [ ] **Step 2: Add the `checklists` client (after the `items` export block)**

```typescript
// ── Checklists ─────────────────────────────────────────────────────────────

export const checklists = {
  list: () => request<Checklist[]>("/checklists"),

  get: (id: string) => request<Checklist>(`/checklists/${id}`),

  create: (title: string) =>
    request<Checklist>("/checklists", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  rename: (id: string, title: string) =>
    request<Checklist>(`/checklists/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  remove: (id: string) =>
    request<void>(`/checklists/${id}`, { method: "DELETE" }),

  addItem: (id: string, name: string) =>
    request<ChecklistItem>(`/checklists/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  updateItem: (
    id: string,
    itemId: string,
    data: { name?: string; checked?: boolean },
  ) =>
    request<ChecklistItem>(`/checklists/${id}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeItem: (id: string, itemId: string) =>
    request<void>(`/checklists/${id}/items/${itemId}`, { method: "DELETE" }),
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run build --workspace=packages/web`
Expected: compiles (the component using this comes in Task 7, but the client typechecks standalone).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/api/index.ts
git commit -m "feat(checklists): add web API client"
```

---

## Task 7: Web UI — ViewBar tab + ChecklistsView

**Files:**

- Modify: `packages/web/src/components/layout/ViewBar.tsx`
- Modify: `packages/web/src/i18n/locales/en.json`
- Create: `packages/web/src/components/ChecklistsView.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Add `"checklists"` to the ViewBar**

In `packages/web/src/components/layout/ViewBar.tsx`, change the `AppView` type and `VIEW_IDS`:

```typescript
export type AppView = "dashboard" | "ideas" | "tasks" | "checklists";

const VIEW_IDS: AppView[] = ["dashboard", "ideas", "tasks", "checklists"];
```

- [ ] **Step 2: Add the i18n label**

In `packages/web/src/i18n/locales/en.json`, add `checklists` to the `app.views` object:

```json
    "views": {
      "dashboard": "Dashboard",
      "tasks": "Tasks",
      "ideas": "Ideas",
      "checklists": "Lists"
    },
```

(Other locales fall back to English via `fallbackLng: "en"`.)

- [ ] **Step 3: Create the ChecklistsView component**

```tsx
import { useEffect, useState } from "react";
import { Checklist, ChecklistItem } from "../types";
import * as api from "../api";

export function ChecklistsView() {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.checklists
      .list()
      .then(setLists)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(title: string) {
    const created = await api.checklists.create(title);
    setLists((prev) => [
      ...prev,
      { ...created, item_count: 0, checked_count: 0 },
    ]);
    setSelectedId(created.id);
  }

  async function handleDeleteList(id: string) {
    await api.checklists.remove(id);
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (selectedId) {
    return (
      <ChecklistDetail
        checklistId={selectedId}
        onBack={() => setSelectedId(null)}
        onDeleted={() => handleDeleteList(selectedId)}
        onRenamed={(title) =>
          setLists((prev) =>
            prev.map((l) => (l.id === selectedId ? { ...l, title } : l)),
          )
        }
      />
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Lists
      </h2>
      <NewListInput onCreate={handleCreate} />
      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          No lists yet. Create one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center justify-between text-left"
            >
              <span className="text-sm text-gray-200">{l.title}</span>
              <span className="text-xs text-gray-500">
                {l.checked_count ?? 0}/{l.item_count ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewListInput({ onCreate }: { onCreate: (title: string) => void }) {
  const [value, setValue] = useState("");
  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setValue("");
  }
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="New list name…"
        className="flex-1 bg-surface-700 border border-surface-500 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent"
      />
      <button
        onClick={submit}
        className="px-3 py-1.5 rounded text-xs font-medium bg-surface-600 text-white hover:bg-surface-500 transition-colors"
      >
        Add
      </button>
    </div>
  );
}

function ChecklistDetail({
  checklistId,
  onBack,
  onDeleted,
  onRenamed,
}: {
  checklistId: string;
  onBack: () => void;
  onDeleted: () => void;
  onRenamed: (title: string) => void;
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.checklists
      .get(checklistId)
      .then((c) => {
        setChecklist(c);
        setItems(c.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [checklistId]);

  async function toggle(item: ChecklistItem) {
    const updated = await api.checklists.updateItem(checklistId, item.id, {
      checked: !item.checked,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function addItem(name: string) {
    const created = await api.checklists.addItem(checklistId, name);
    setItems((prev) => [...prev, created]);
  }

  async function removeItem(id: string) {
    await api.checklists.removeItem(checklistId, id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function rename() {
    const next = window.prompt("Rename list", checklist?.title);
    if (!next?.trim()) return;
    const updated = await api.checklists.rename(checklistId, next.trim());
    setChecklist(updated);
    onRenamed(updated.title);
  }

  async function deleteList() {
    if (!window.confirm("Delete this list and all its items?")) return;
    onDeleted();
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600"
          >
            ← Lists
          </button>
          <h2 className="text-sm font-medium text-gray-200 truncate">
            {checklist?.title ?? ""}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={rename}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-surface-600"
          >
            Rename
          </button>
          <button
            onClick={deleteList}
            className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-surface-600"
          >
            Delete
          </button>
        </div>
      </div>

      <NewListInput onCreate={addItem} />

      {loading ? (
        <p className="text-sm text-gray-600 py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">
          No items yet. Add one above.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="card hover:border-surface-400 hover:bg-surface-600 transition-colors py-2 px-3 flex items-center gap-3 group"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item)}
                className="w-4 h-4 accent-accent cursor-pointer shrink-0"
              />
              <span
                className={`flex-1 text-sm min-w-0 ${
                  item.checked ? "text-gray-500 line-through" : "text-gray-200"
                }`}
              >
                {item.name}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-sm"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Render it from App.tsx**

In `packages/web/src/App.tsx`, add the import near the other view imports (after `import { TasksView } ...`):

```typescript
import { ChecklistsView } from "./components/ChecklistsView";
```

In `renderMain()`, add a branch alongside the other `currentView` checks (after the `tasks` line):

```typescript
    if (currentView === "ideas") return <IdeasView />;
    if (currentView === "tasks") return <TasksView />;
    if (currentView === "checklists") return <ChecklistsView />;
```

(`handleViewChange` already clears the selected tag for any non-dashboard view, so no other change is needed.)

- [ ] **Step 5: Typecheck and build the web app**

Run: `npm run build --workspace=packages/web`
Expected: compiles with no type errors.

- [ ] **Step 6: Manual smoke test (if a local stack is available)**

Run `npm run dev`, log in, click the new **Lists** tab. Create a list, open it, add items, tick a checkbox (name goes struck-through and stays in place), delete an item, rename and delete the list. If no local stack is available, note this step as skipped and rely on the build + server tests.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/ChecklistsView.tsx packages/web/src/components/layout/ViewBar.tsx packages/web/src/App.tsx packages/web/src/i18n/locales/en.json
git commit -m "feat(checklists): add web Lists view"
```

---

## Task 8: Mobile API client

**Files:**

- Create: `packages/mobile/src/api/checklists.ts`

- [ ] **Step 1: Write the client**

```typescript
import { api } from "./client";
import type { Checklist, ChecklistItem } from "@notes-world/shared";

export function listChecklists(): Promise<Checklist[]> {
  return api.get<Checklist[]>("/checklists");
}

export function getChecklist(id: string): Promise<Checklist> {
  return api.get<Checklist>(`/checklists/${id}`);
}

export function createChecklist(title: string): Promise<Checklist> {
  return api.post<Checklist>("/checklists", { title });
}

export function renameChecklist(id: string, title: string): Promise<Checklist> {
  return api.patch<Checklist>(`/checklists/${id}`, { title });
}

export function deleteChecklist(id: string): Promise<void> {
  return api.delete<void>(`/checklists/${id}`);
}

export function addChecklistItem(
  id: string,
  name: string,
): Promise<ChecklistItem> {
  return api.post<ChecklistItem>(`/checklists/${id}/items`, { name });
}

export function updateChecklistItem(
  id: string,
  itemId: string,
  data: { name?: string; checked?: boolean },
): Promise<ChecklistItem> {
  return api.patch<ChecklistItem>(`/checklists/${id}/items/${itemId}`, data);
}

export function deleteChecklistItem(id: string, itemId: string): Promise<void> {
  return api.delete<void>(`/checklists/${id}/items/${itemId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/src/api/checklists.ts
git commit -m "feat(checklists): add mobile API client"
```

---

## Task 9: Mobile UI — tab + list screen + detail screen

**Files:**

- Modify: `packages/mobile/src/i18n/locales/en.json`
- Modify: `packages/mobile/app/(tabs)/_layout.tsx`
- Create: `packages/mobile/app/(tabs)/checklists.tsx`
- Create: `packages/mobile/app/checklist/[id].tsx`

- [ ] **Step 1: Add the tab label**

In `packages/mobile/src/i18n/locales/en.json`, add `checklists` to the `tabs` object:

```json
  "tabs": {
    "notes": "Notes",
    "capture": "Capture",
    "tags": "Tags",
    "checklists": "Lists",
    "account": "Account"
  },
```

- [ ] **Step 2: Register the tab**

In `packages/mobile/app/(tabs)/_layout.tsx`, add a `<Tabs.Screen>` immediately after the `tags` screen:

```tsx
<Tabs.Screen
  name="checklists"
  options={{
    title: t("tabs.checklists"),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="checkbox-outline" size={size} color={color} />
    ),
  }}
/>
```

- [ ] **Step 3: Create the list screen**

```tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { listChecklists, createChecklist } from "../../src/api/checklists";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import type { Checklist } from "@notes-world/shared";

export default function ChecklistsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    try {
      setLists(await listChecklists());
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistsScreen.load",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function onCreate() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const created = await createChecklist(title);
      setNewTitle("");
      setLists((prev) => [...prev, created]);
      router.push(`/checklist/${created.id}` as never);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistsScreen.create",
      });
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Text style={s.heading}>{t("tabs.checklists")}</Text>
      <View style={s.addRow}>
        <TextInput
          style={s.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="New list name…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onCreate}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={onCreate}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/checklist/${item.id}` as never)}
            >
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.count}>
                {item.checked_count ?? 0}/{item.item_count ?? 0}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>No lists yet</Text>}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: font.md,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: font.md },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface },
  title: { flex: 1, color: colors.text, fontSize: font.md },
  count: {
    color: colors.textMuted,
    fontSize: font.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
```

- [ ] **Step 4: Create the detail screen**

```tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../src/api/checklists";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import type { ChecklistItem } from "@notes-world/shared";

export default function ChecklistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    getChecklist(id)
      .then((c) => {
        navigation.setOptions({ headerTitle: c.title });
        setItems(c.items ?? []);
      })
      .catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "ChecklistDetailScreen.load",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggle(item: ChecklistItem) {
    try {
      const updated = await updateChecklistItem(id, item.id, {
        checked: !item.checked,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.toggle",
      });
    }
  }

  async function onAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await addChecklistItem(id, name);
      setNewName("");
      setItems((prev) => [...prev, created]);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.add",
      });
    }
  }

  async function onDelete(itemId: string) {
    try {
      await deleteChecklistItem(id, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.delete",
      });
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <View style={s.addRow}>
        <TextInput
          style={s.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Add item…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={onAdd}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Pressable style={s.check} onPress={() => toggle(item)}>
                <Ionicons
                  name={item.checked ? "checkbox" : "square-outline"}
                  size={22}
                  color={item.checked ? colors.accent : colors.textMuted}
                />
              </Pressable>
              <Text style={[s.name, item.checked && s.nameChecked]}>
                {item.name}
              </Text>
              <Pressable onPress={() => onDelete(item.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No items yet</Text>}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  addRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: font.md,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: font.md },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  check: { padding: 2 },
  name: { flex: 1, color: colors.text, fontSize: font.md },
  nameChecked: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
```

- [ ] **Step 5: Typecheck the mobile package**

Run: `npx tsc --noEmit -p packages/mobile/tsconfig.json`
Expected: no type errors. (If the mobile tsconfig path differs, use the project's standard typecheck command; confirm the new screens compile against `@notes-world/shared`.)

- [ ] **Step 6: Commit**

```bash
git add "packages/mobile/app/(tabs)/checklists.tsx" packages/mobile/app/checklist/ "packages/mobile/app/(tabs)/_layout.tsx" packages/mobile/src/i18n/locales/en.json
git commit -m "feat(checklists): add mobile Lists tab and detail screen"
```

---

## Task 10: MCP tools

**Files:**

- Create: `packages/mcp/src/tools/checklists.ts`
- Modify: `packages/mcp/src/index.ts`

- [ ] **Step 1: Write the tools**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, patch, del } from "../api";

export function registerChecklistTools(server: McpServer) {
  server.tool(
    "list_checklists",
    "List all checklists (shopping lists) with item counts.",
    {},
    async () => {
      const lists = await get("/api/checklists");
      return {
        content: [{ type: "text", text: JSON.stringify(lists, null, 2) }],
      };
    },
  );

  server.tool(
    "get_checklist",
    "Get one checklist with all of its items.",
    { checklist_id: z.string().describe("Checklist UUID") },
    async ({ checklist_id }) => {
      const list = await get(`/api/checklists/${checklist_id}`);
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.tool(
    "create_checklist",
    "Create a new checklist (shopping list).",
    { title: z.string().describe("List name, e.g. Groceries") },
    async ({ title }) => {
      const list = await post("/api/checklists", { title });
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.tool(
    "rename_checklist",
    "Rename a checklist.",
    {
      checklist_id: z.string().describe("Checklist UUID"),
      title: z.string().describe("New list name"),
    },
    async ({ checklist_id, title }) => {
      const list = await patch(`/api/checklists/${checklist_id}`, { title });
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_checklist",
    "Delete a checklist and all of its items.",
    { checklist_id: z.string().describe("Checklist UUID") },
    async ({ checklist_id }) => {
      await del(`/api/checklists/${checklist_id}`);
      return {
        content: [{ type: "text", text: `Deleted checklist ${checklist_id}` }],
      };
    },
  );

  server.tool(
    "add_checklist_item",
    "Add an item to a checklist (defaults to unchecked = still needed).",
    {
      checklist_id: z.string().describe("Checklist UUID"),
      name: z.string().describe("Item name, e.g. Milk"),
    },
    async ({ checklist_id, name }) => {
      const item = await post(`/api/checklists/${checklist_id}/items`, {
        name,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    },
  );

  server.tool(
    "update_checklist_item",
    "Update a checklist item — set checked (true = got it) and/or rename it.",
    {
      checklist_id: z.string().describe("Checklist UUID"),
      item_id: z.string().describe("Checklist item UUID"),
      checked: z.boolean().optional().describe("true = have it / got it"),
      name: z.string().optional().describe("New item name"),
    },
    async ({ checklist_id, item_id, checked, name }) => {
      const body: { checked?: boolean; name?: string } = {};
      if (checked !== undefined) body.checked = checked;
      if (name !== undefined) body.name = name;
      const item = await patch(
        `/api/checklists/${checklist_id}/items/${item_id}`,
        body,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_checklist_item",
    "Remove an item from a checklist.",
    {
      checklist_id: z.string().describe("Checklist UUID"),
      item_id: z.string().describe("Checklist item UUID"),
    },
    async ({ checklist_id, item_id }) => {
      await del(`/api/checklists/${checklist_id}/items/${item_id}`);
      return {
        content: [{ type: "text", text: `Deleted item ${item_id}` }],
      };
    },
  );
}
```

- [ ] **Step 2: Register the tools in the MCP server**

In `packages/mcp/src/index.ts`, add the import alongside the other tool imports:

```typescript
import { registerChecklistTools } from "./tools/checklists";
```

And call it inside `buildServer()`, after `registerExportTools(server)`:

```typescript
registerExportTools(server);
registerChecklistTools(server);
```

- [ ] **Step 3: Typecheck/build the MCP package**

Run: `npm run build --workspace=packages/mcp`
Expected: compiles with no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp/src/tools/checklists.ts packages/mcp/src/index.ts
git commit -m "feat(checklists): add MCP checklist tools"
```

---

## Task 11: Full verification + Android AAB

**Files:** none (verification + build only)

- [ ] **Step 1: Build every package**

Run:

```bash
npm run build --workspace=packages/shared
npm run build --workspace=packages/server
npm run build --workspace=packages/web
npm run build --workspace=packages/mcp
```

Expected: all four compile with no errors.

- [ ] **Step 2: Run the full server test suite**

Run: `npm test --workspace=packages/server`
Expected: all suites pass; coverage ≥ 80%.

- [ ] **Step 3: Build the Android AAB**

The mobile JS bundle is produced as part of the Gradle release build. From `packages/mobile/android/`:

```bash
./gradlew bundleRelease
```

Expected output: `packages/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

If the build fails with package-name / autolinking errors, clear the caches and retry:

```bash
rm -rf packages/mobile/android/build packages/mobile/android/app/build
./gradlew bundleRelease
```

(Release keystore: `packages/mobile/android/app/keystore/release.keystore`; signing config is already in `build.gradle`. Package name: `notes.world`.)

- [ ] **Step 4: Confirm the AAB exists**

Run: `ls -la packages/mobile/android/app/build/outputs/bundle/release/app-release.aab`
Expected: the signed `.aab` file is present. This is the priority deliverable for Play Store upload.

- [ ] **Step 5: Final commit (if any build artifacts/changes remain)**

```bash
git status
# commit any remaining tracked changes from the verification step
```

---

## Self-Review (completed)

- **Spec coverage:** data model → Task 1; shared types → Task 2; API (all 8 endpoints) → Tasks 3–5; web (ViewBar + ChecklistsView + i18n) → Tasks 6–7; mobile (tab + list + detail + AAB) → Tasks 8–9, 11; MCP (8 tools) → Task 10; testing (service + contract, validation, user-scoping, cascade) → Tasks 4–5. Out-of-scope items (reorder, hide checked) correctly omitted.
- **Placeholder scan:** none — every code step contains complete code.
- **Type consistency:** `Checklist` / `ChecklistItem` field names (`name`, `checked`, `sort_order`, `item_count`, `checked_count`, `items`) are identical across shared types, repository, service, controller, tests, web client, mobile client, and MCP tools. Route shapes (`/api/checklists/:id/items/:itemId`) match between routes, contract tests, all three clients. Service method names (`createChecklist`, `getChecklist`, `renameChecklist`, `deleteChecklist`, `addItem`, `updateItem`, `deleteItem`, `listChecklists`) match between service, tests, and controller.
