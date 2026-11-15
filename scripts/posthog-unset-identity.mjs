const apply = process.argv.includes("--apply");
const { POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_API_KEY } =
  process.env;

if (!POSTHOG_PERSONAL_API_KEY || !POSTHOG_PROJECT_ID || !POSTHOG_API_KEY) {
  console.error(
    "Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID and POSTHOG_API_KEY.",
  );
  process.exit(1);
}

const response = await fetch(
  `https://eu.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/query/`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT person_id, any(distinct_id)
          FROM person_distinct_ids
          WHERE person.properties.email IS NOT NULL
             OR person.properties.name IS NOT NULL
          GROUP BY person_id
          LIMIT 50000`,
      },
    }),
  },
);
if (!response.ok) {
  console.error(`Query failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}
const { results } = await response.json();
const distinctIds = results.map(([, distinctId]) => distinctId);

console.log(`${distinctIds.length} person profiles carry an email or name.`);
if (!apply) {
  console.log("Dry run. Pass --apply to remove them.");
  process.exit(0);
}

for (let start = 0; start < distinctIds.length; start += 500) {
  const batch = distinctIds.slice(start, start + 500).map((distinctId) => ({
    event: "$set",
    distinct_id: distinctId,
    properties: { $unset: ["email", "name"] },
  }));
  const sent = await fetch("https://eu.i.posthog.com/batch/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: POSTHOG_API_KEY, batch }),
  });
  if (!sent.ok) {
    console.error(`Batch at ${start} failed: ${sent.status}`);
    process.exit(1);
  }
}
console.log(
  `Sent $unset for ${distinctIds.length} profiles. Ingestion applies it within minutes.`,
);
