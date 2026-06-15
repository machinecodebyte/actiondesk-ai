import { agentRouter } from "../routers/agent.router.js";
import { approvalsRouter } from "../routers/approvals.router.js";
import { authRouter } from "../routers/auth.router.js";
import { calendarRouter } from "../routers/calendar.router.js";
import { commandsRouter } from "../routers/commands.router.js";
import { healthRouter } from "../routers/health.router.js";
import { inboxRouter } from "../routers/inbox.router.js";
import { integrationsRouter } from "../routers/integrations.router.js";
import { searchRouter } from "../routers/search.router.js";
import { workspaceRouter } from "../routers/workspace.router.js";
import { router } from "./procedures.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  workspace: workspaceRouter,
  integrations: integrationsRouter,
  inbox: inboxRouter,
  calendar: calendarRouter,
  commands: commandsRouter,
  agent: agentRouter,
  search: searchRouter,
  approvals: approvalsRouter
});

export type AppRouter = typeof appRouter;
