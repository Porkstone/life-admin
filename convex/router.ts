import { httpRouter } from "convex/server";
import { apiRead, mcp } from "./agentHttp";

const http = httpRouter();
http.route({ path: "/agent/v1/read", method: "POST", handler: apiRead });
http.route({ path: "/agent/v1/read", method: "OPTIONS", handler: apiRead });
for (const method of ["POST", "GET", "DELETE", "OPTIONS"] as const) {
  http.route({ path: "/mcp", method, handler: mcp });
}
export default http;
