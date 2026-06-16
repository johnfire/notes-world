import { api } from "./client";
import type { DashboardResponse } from "@notes-world/shared";

export function getDashboard(): Promise<DashboardResponse> {
  return api.get<DashboardResponse>("/dashboard");
}
