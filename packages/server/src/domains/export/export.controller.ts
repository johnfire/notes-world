import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./export.service";

export const exportTag = wrapAsync(async (req: Request, res: Response) => {
  const { filename, markdown } = await service.exportTag(
    req.userId,
    req.params.tagId,
  );
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(markdown);
});

export const exportUntagged = wrapAsync(async (req: Request, res: Response) => {
  const { filename, markdown } = await service.exportUntagged(req.userId);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(markdown);
});

export const exportAll = wrapAsync(async (req: Request, res: Response) => {
  const stream = await service.exportAll(req.userId);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="notes-world-export-${date}.zip"`,
  );
  stream.pipe(res);
});

export const exportJson = wrapAsync(async (req: Request, res: Response) => {
  const data = await service.exportJson(req.userId);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="notes-world-${date}.json"`,
  );
  res.json(data);
});

export const exportCsv = wrapAsync(async (req: Request, res: Response) => {
  const csv = await service.exportCsv(req.userId);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="notes-world-${date}.csv"`,
  );
  res.send(csv);
});
