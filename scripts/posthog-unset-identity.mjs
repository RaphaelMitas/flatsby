// Removes the email and name that app builds before analytics consent sent to PostHog person profiles.
// Dry run by default; pass --apply to send the $unset events.
//
// POSTHOG_PERSONAL_API_KEY  personal API key with query:read
// POSTHOG_PROJECT_ID        the EU project's numeric id
// POSTHOG_API_KEY           the project token (phc_...), used to send the $unset events
//
// Builds from before this change re-send email and name on every launch, so run it again
// once most users have updated.
//
// PostHog has no API to delete events by name or date, so the pre-consent $screen events
// can only be deleted with their whole person; otherwise they expire with the 12-month retention.

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

// The delete_property endpoint writes a $delete_person_property event that ingestion ignores
// (PostHog issue #35659); an event carrying $unset is processed.
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
