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
