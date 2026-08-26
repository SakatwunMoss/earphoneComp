import type { JsonLd as JsonLdData } from "@/lib/json-ld";

type JsonLdProps = {
  data: JsonLdData | JsonLdData[];
};

/** schema.org の JSON-LD を埋め込む（Server Components 向け） */
export function JsonLd({ data }: JsonLdProps) {
  const payloads = Array.isArray(data) ? data : [data];

  return (
    <>
      {payloads.map((payload, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(payload),
          }}
        />
      ))}
    </>
  );
}
