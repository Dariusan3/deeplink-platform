/**
 * Emits JSON-LD structured data. Server component — the script lands in the
 * initial HTML so crawlers and AI engines that don't execute JS still see it.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Schema is authored by us in src/lib/seo.ts, never user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
