import { Router } from "express";

import { fetchLatestCatalogMetadata } from "../catalog-service";

export const catalogRouter = Router();

catalogRouter.get("/latest", async (_request, response) => {
  try {
    const metadata = await fetchLatestCatalogMetadata();
    response.json({ data: metadata });
  } catch (error) {
    console.error("Failed to fetch latest catalog metadata", error);
    response.status(500).json({ error: "Failed to fetch catalog metadata" });
  }
});
