LICENSEMOTION PORTFOLIO MANAGER — INSTALLATION
==============================================

This package adds a private /admin workspace and Vercel server-side API routes.
It keeps the existing public site design and the original images folder.

BEFORE INSTALLING
-----------------
1. Keep a backup of your current project folder.
2. In Vercel > Project > Settings > Environment Variables, confirm these
   seven Production variables exist (values must not be shared):

   SUPABASE_URL
   SUPABASE_SECRET_KEY
   ADMIN_PASSWORD
   SESSION_SECRET
   CLOUDINARY_CLOUD_NAME
   CLOUDINARY_API_KEY
   CLOUDINARY_API_SECRET

3. The ADMIN_PASSWORD that appeared visibly in an earlier chat screenshot
   should have been replaced with a new unique password before first use.
4. SESSION_SECRET should be a private random value with at least 32 chars.

INSTALL INTO YOUR EXISTING GITHUB DESKTOP REPOSITORY
---------------------------------------------------
1. Extract this ZIP to a temporary folder.
2. Open your existing local repository folder (the one managed by GitHub
   Desktop, named license.../licensemoton).
3. Copy/merge the contents of the extracted package into that existing
   repository root. Allow index.html to be replaced.
4. Keep your existing .git folder. Do NOT copy a .git folder from anywhere.
5. Do not copy any .env files or secrets into the repository.
6. Confirm the root now contains:

   index.html          (updated to load the portfolio from Supabase)
   admin.html          (private admin UI; visit /admin)
   vercel.json         (routes /admin to admin.html)
   api/                (Vercel serverless API routes)
   server/lib/         (server-side auth and database helpers)
   images/             (the existing image assets)
   sitemap.xml

7. Open GitHub Desktop. Review the changed files. Commit with a message such
   as: Add secure portfolio admin manager.
8. Push origin to the main branch. Vercel will create a deployment.
9. Wait for the Vercel deployment to show Ready, then test:
   - https://www.licensemotions.com/  (public portfolio)
   - https://www.licensemotions.com/admin (admin login)

IMPORTANT SECURITY NOTES
------------------------
- SUPABASE_SECRET_KEY, CLOUDINARY_API_SECRET, ADMIN_PASSWORD and
  SESSION_SECRET are used only by server-side API routes. Do not put them in
  HTML, browser JavaScript, GitHub, or this ZIP.
- The browser uploads media directly to Cloudinary using a short-lived
  server-generated signature. The Cloudinary API secret never reaches the
  browser.
- Public visitors receive published portfolio rows only. Admin create/edit/
  delete actions require the signed HttpOnly session cookie.
- Deleting a row from the admin panel removes it from the website database,
  but it does not delete the original file from Cloudinary.
- Do not click Redeploy for the environment variables alone. Push the code
  package first; the new deployment will pick up the Production variables.

ROLLBACK
--------
The Vercel deployment can be rolled back from the Deployments page. The
previous public deployment remains available until the new deployment is
promoted. Keep the local backup until the new /admin and public portfolio
have both been tested.
