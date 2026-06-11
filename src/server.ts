import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

connectDB()
  .then(() => {
    app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
