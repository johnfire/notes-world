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
