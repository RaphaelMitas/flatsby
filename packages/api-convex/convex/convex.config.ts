import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();

// Install Better Auth component
app.use(betterAuth);

// Install the agent component
app.use(agent);

export default app;
