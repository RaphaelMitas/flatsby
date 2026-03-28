// Maestro runScript: calls the E2E API to create a test session
// and returns the token for deep link injection.
const response = http.post(E2E_API_URL + "/api/e2e/create-session", {
  body: "{}",
  headers: { "Content-Type": "application/json" },
});
const data = JSON.parse(response.body);

if (!data.ok) {
  throw new Error("Failed to create E2E session: " + response.body);
}

output.SESSION = { token: data.token };
