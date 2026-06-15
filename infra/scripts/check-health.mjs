const endpoints = [
  ["web", process.env.WEB_URL ?? "http://localhost:3050"],
  ["api-gateway", process.env.API_GATEWAY_URL ?? "http://localhost:4050"],
  ["auth-service", process.env.AUTH_SERVICE_URL ?? "http://localhost:4151"],
  ["integration-service", process.env.INTEGRATION_SERVICE_URL ?? "http://localhost:4152"],
  ["mail-service", process.env.MAIL_SERVICE_URL ?? "http://localhost:4153"],
  ["calendar-service", process.env.CALENDAR_SERVICE_URL ?? "http://localhost:4154"],
  ["command-service", process.env.COMMAND_SERVICE_URL ?? "http://localhost:4155"],
  ["ai-service", process.env.AI_SERVICE_URL ?? "http://localhost:4156"],
  ["agent-service", process.env.AGENT_SERVICE_URL ?? "http://localhost:4157"],
  ["search-service", process.env.SEARCH_SERVICE_URL ?? "http://localhost:4158"],
  ["webhook-service", process.env.WEBHOOK_SERVICE_URL ?? "http://localhost:4159"],
  ["worker-service", process.env.WORKER_SERVICE_URL ?? "http://localhost:4160"],
  ["realtime-service", process.env.REALTIME_SERVICE_URL ?? "http://localhost:4161"]
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
