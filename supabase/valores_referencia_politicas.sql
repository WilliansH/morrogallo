-- ---------------------------------------------------------------------------
-- valores_referencia — ajuste único
--
-- Las políticas ya existían y están bien: lectura_publica [SELECT] y
-- admin_actualiza_valor [INSERT], sin UPDATE ni DELETE, que es justo la regla
-- (un valor nuevo es una fila nueva, nadie edita el historial). No hay nada
-- que agregar ahí.
--
-- Lo único que falta es que la vista respete esas políticas en vez de leer con
-- los permisos de su dueño. Hoy da igual porque la lectura es pública, pero si
-- algún día se cierra, la vista sería un hueco por donde entrar.
-- ---------------------------------------------------------------------------

alter view public.v_valores_actuales set (security_invoker = on);

-- Comprobación: dos políticas, select e insert, ninguna de update o delete.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'valores_referencia'
order by cmd;
