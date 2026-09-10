import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital");

  return (
    <main style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Prueba de conexión</h1>
      {error ? (
        <pre style={{ color: "crimson" }}>ERROR: {error.message}</pre>
      ) : (
        <ul>
          {data?.map((p) => (
            <li key={p.id}>
              {p.nombre} {p.es_capital ? "(capital)" : ""}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
