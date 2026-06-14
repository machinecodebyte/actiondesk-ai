const endpoints = [
  ["web", process.env.WEB_URL ?? "http://localhost:3000"],
  ["api-gateway", process.env.API_GATEWAY_URL ?? "http://localhost:4000"],
  ["auth-service", process.env.AUTH_SERVICE_URL ?? "http://localhost:4010"],
  ["integration-service", process.env.INTEGRATION_SERVICE_URL ?? "http://localhost:4011"],
  ["mail-service", process.env.MAIL_SERVICE_URL ?? "http://localhost:4012"],
  ["calendar-service", process.env.CALENDAR_SERVICE_URL ?? "http://localhost:4013"],
  ["command-service", process.env.COMMAND_SERVICE_URL ?? "http://localhost:4014"],
  ["ai-service", process.env.AI_SERVICE_URL ?? "http://localhost:4015"],
  ["agent-service", process.env.AGENT_SERVICE_URL ?? "http://localhost:4016"],
  ["search-service", process.env.SEARCH_SERVICE_URL ?? "http://localhost:4017"],
  ["webhook-service", process.env.WEBHOOK_SERVICE_URL ?? "http://localhost:4018"],
  ["worker-service", process.env.WORKER_SERVICE_URL ?? "http://localhost:4019"],
  ["realtime-service", process.env.REALTIME_SERVICE_URL ?? "http://localhost:4020"]
];

for (const [name, baseUrl] of endpoints) {
  const url = name === "web" ? baseUrl : `${baseUrl}/health`;

  try {
    const response = await fetch(url);
    console.log(`${name}: ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    console.log(`${name}: unavailable (${message})`);
  }
}
