// Maestro runScript: calls the E2E API to create a test session
// and returns the token for deep link injection.
var headers = { "Content-Type": "application/json" };
if (typeof VERCEL_BYPASS_SECRET !== "undefined" && VERCEL_BYPASS_SECRET) {
  headers["x-vercel-protection-bypass"] = VERCEL_BYPASS_SECRET;
}
const response = http.post(E2E_API_URL + "/api/e2e/create-session", {
  body: "{}",
  headers: headers,
});
const data = JSON.parse(response.body);

if (!data.ok) {
  throw new Error("Failed to create E2E session: " + response.body);
}

output.SESSION = { token: data.token };
