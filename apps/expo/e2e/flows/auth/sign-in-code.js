const response = http.get(
  `${E2E_API_URL}/api/e2e/sign-in-code?email=${encodeURIComponent(EMAIL)}`,
);
output.signInCode = json(response.body).code;
