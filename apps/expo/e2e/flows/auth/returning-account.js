const response = http.post(
  `${E2E_API_URL}/api/e2e/create-session?returning=1&email=${encodeURIComponent(EMAIL)}`,
  { body: "" },
);
if (response.status !== 200)
  throw new Error(`create-session ${response.status}`);
