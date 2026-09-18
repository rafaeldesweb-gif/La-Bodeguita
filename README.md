<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/46f0e2e6-af17-4662-9b6c-1a2e65864c1d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase Dashboard, run [database/supabase-schema.sql](database/supabase-schema.sql) in the SQL Editor. It enables Row Level Security and leaves menu edits and order management restricted to administrators.
   If you had already run the previous schema, run [database/migrations/20260826_add_customer_phone.sql](database/migrations/20260826_add_customer_phone.sql) once to add customer phone numbers.
   Run [database/migrations/20260826_add_admin_login_setting.sql](database/migrations/20260826_add_admin_login_setting.sql) once to enforce the authorised Control de pedidos email.
4. In **Authentication > URL Configuration**, add your local and production URLs to **Redirect URLs** (for example `http://localhost:3000` and your Hostinger domain).
5. Request an access link from the app using the administrator email. After opening it, promote that user once from SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```
   Sign out and request a new link. Only users with this role can manage products or orders.
6. Run the app:
   `npm run dev`
