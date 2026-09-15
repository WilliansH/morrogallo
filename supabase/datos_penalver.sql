-- ---------------------------------------------------------------------------
-- Primeros datos del Municipio Fernando de Peñalver
--
-- LÉEME ANTES DE CORRER ESTO.
--
-- Ninguna de estas cifras es oficial. Son lo mejor que hay disponible en
-- fuentes públicas, y cada una entra diciendo exactamente de dónde salió. Por
-- eso todas entran como 'en_revision': son el punto de partida para que los
-- vecinos las corroboren o las reemplacen con las de la Alcaldía, no una
-- autoridad.
--
-- Dos de ellas se contradicen a propósito: la superficie aparece como 643 km²
-- en una fuente y 757 km² en otra. No se escogió ninguna. Así es como debe
-- funcionar el sitio: las dos visibles, con su fuente, hasta que alguien con
-- el documento en la mano resuelva cuál es.
--
-- Correr UNA sola vez. Si se corre dos veces, quedan duplicadas (y eso no es
-- un error del modelo: un aporte repetido es un aporte nuevo).
-- ---------------------------------------------------------------------------

insert into public.estadisticas (municipio_id, tipo, valor, fuente, estado)
select m.id, d.tipo, d.valor, d.fuente, 'en_revision'::estado_dato
from public.municipios m
cross join (values
  (
    'Superficie del municipio',
    '643 km²',
    'Ficha de Wikipedia en español, consultada el 15/09/2026. Sin documento oficial que la respalde: hace falta confirmarla con la Alcaldía.'
  ),
  (
    'Superficie del municipio',
    '757 km²',
    'Wikipedia en inglés, citando datos de la OCEI (hoy INE), consultada el 15/09/2026. Contradice los 643 km² de la fuente en español.'
  ),
  (
    'Población del municipio',
    '33.437 hab.',
    'Censo Nacional de Población y Vivienda 2011 (INE), cifra citada en Wikipedia en inglés. Es el último censo hecho en el país.'
  ),
  (
    'Población del municipio',
    '36.271 hab.',
    'Proyección para 2023 citada en la ficha de Wikipedia en español. Es una estimación, no un conteo.'
  ),
  (
    'Población del municipio',
    '26.059 hab.',
    'Censo Nacional de Población y Vivienda 2000 (INE), cifra citada en Wikipedia en inglés. Sirve para ver el crecimiento entre censos.'
  ),
  (
    'Densidad de población',
    '44,17 hab./km²',
    'Cálculo sobre el censo 2011 y una superficie de 757 km², publicado en Wikipedia en inglés. Cambia si se confirma que la superficie son 643 km².'
  ),
  (
    'Parroquias',
    '3',
    'Puerto Píritu (capital), San Miguel y Sucre. División político-territorial del municipio, coincidente en todas las fuentes consultadas.'
  )
) as d(tipo, valor, fuente)
where m.nombre ilike '%peñalver%';

-- Qué quedó cargado.
select tipo, valor, estado, left(fuente, 60) as fuente
from public.estadisticas
order by tipo, valor;
