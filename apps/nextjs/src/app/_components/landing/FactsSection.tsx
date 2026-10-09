import { FACTS, SECTIONS } from "./content";

export function FactsSection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              {section.title}
            </h2>
            <p className="text-muted-foreground">{section.body}</p>
          </div>
        ))}
        <div id="at-a-glance">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            Flatsby at a glance
          </h2>
          <dl className="divide-y">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="py-3 sm:grid sm:grid-cols-3 sm:gap-4"
              >
                <dt className="font-medium">{fact.label}</dt>
                <dd className="text-muted-foreground sm:col-span-2">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
