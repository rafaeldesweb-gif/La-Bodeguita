-- Este script "a prueba de balas" intentará insertar las columnas una por una.
-- Si hay un error de tipo en alguna columna (como 'contraseña'), la omitirá en lugar de abortar todo.
-- Así por fin te dejará crear la cuenta y podremos ver qué columna estaba fallando al ver cuál queda vacía.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. Intentamos insertar sólo lo fundamental
  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'role', 'customer')::app_role
    );
  EXCEPTION WHEN OTHERS THEN 
    -- Si falla el rol (porque no encaja), metemos el perfil sin especificar rol inicialmente
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  END;

  -- 2. Actualizamos el teléfono
  BEGIN
    UPDATE public.profiles SET phone = new.raw_user_meta_data->>'phone' WHERE id = new.id;
  EXCEPTION WHEN OTHERS THEN END;

  -- 3. Actualizamos el email
  BEGIN
    UPDATE public.profiles SET email = new.email WHERE id = new.id;
  EXCEPTION WHEN OTHERS THEN END;

  -- 4. Actualizamos la contraseña
  BEGIN
    UPDATE public.profiles SET password = new.raw_user_meta_data->>'plain_password' WHERE id = new.id;
  EXCEPTION WHEN OTHERS THEN END;
    
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
