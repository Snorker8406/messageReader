import cors from "cors";
import express from "express";

import { env } from "./env";
import { chatRouter } from "./routes/chat";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/chat-histories", chatRouter);

app.use((request, response) => {
  response.status(404).json({ error: `Not found: ${request.path}` });
});

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
