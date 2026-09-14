import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { iniciarSesion, registrarse } from "./acciones";

export const metadata = { title: "Entrar" };

type Busqueda = {
  modo?: string;
  error?: string;
  aviso?: string;
};

const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const boton =
  "cifra w-full text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const { modo, error, aviso } = await searchParams;
  const esRegistro = modo === "registro";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { data: parroquias } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital")
    .order("es_capital", { ascending: false })
    .order("nombre", { ascending: true });

  return (
    <main className="flex-1 bg-arena-50">
      <div className="mx-auto max-w-md px-6 py-16 md:py-24">
        <Link
          href="/"
          className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
        >
          ← Morrogallo
        </Link>

        <h1 className="font-display text-4xl mt-6 leading-tight">
          {esRegistro ? "Crea tu cuenta" : "Entra a tu cuenta"}
        </h1>

        <p className="text-tinta-600 mt-4 leading-relaxed">
          {esRegistro
            ? "Con tu correo y tu parroquia basta. Nada de esto se publica."
            : "Para aportar datos, subir fotos y corroborar lo que suben tus vecinos."}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-8 border border-estrella-500/40 bg-white px-4 py-3 text-sm text-estrella-600"
          >
            {error}
          </p>
        ) : null}

        {aviso ? (
          <p
            role="status"
            className="mt-8 border border-monte-400/50 bg-white px-4 py-3 text-sm text-monte-600"
          >
            {aviso}
          </p>
        ) : null}

        <form
          action={esRegistro ? registrarse : iniciarSesion}
          className="mt-8 flex flex-col gap-5"
        >
          <div>
            <label className={etiqueta} htmlFor="correo">
              Correo
            </label>
            <input
              className={campo}
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="clave">
              Contraseña
            </label>
            <input
              className={campo}
              id="clave"
              name="clave"
              type="password"
              autoComplete={esRegistro ? "new-password" : "current-password"}
              required
              minLength={esRegistro ? 8 : undefined}
              placeholder={esRegistro ? "Mínimo 8 caracteres" : ""}
            />
          </div>

          {esRegistro ? (
            <div>
              <label className={etiqueta} htmlFor="parroquia">
                Tu parroquia
              </label>
              <select className={campo} id="parroquia" name="parroquia" required>
                <option value="">Elige una</option>
                {(parroquias ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.es_capital ? " (capital)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-tinta-400 mt-2">
                Por ahora solo Municipio Fernando de Peñalver.
              </p>
            </div>
          ) : null}

          <button className={boton} type="submit">
            {esRegistro ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-tinta-600 mt-8">
          {esRegistro ? "¿Ya tienes cuenta? " : "¿Todavía no tienes cuenta? "}
          <Link
            href={esRegistro ? "/entrar" : "/entrar?modo=registro"}
            className="text-mar-700 underline underline-offset-4 hover:text-mar-500 transition-colors"
          >
            {esRegistro ? "Entra aquí" : "Créala aquí"}
          </Link>
        </p>
      </div>
    </main>
  );
}
