import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`gradera-api listening on http://0.0.0.0:${env.PORT}`);
  console.log(`Health check: http://0.0.0.0:${env.PORT}/health`);
});
