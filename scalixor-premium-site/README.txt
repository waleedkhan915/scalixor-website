SCALIXOR PREMIUM SITE — NETLIFY REVIEW SYSTEM
==============================================

This version includes the complete Scalixor website plus a private review moderation system.

WHAT WAS ADDED
---------------
1. Public Reviews page with a submission form.
2. Every submitted review starts as PENDING.
3. Private Review Manager at /admin-reviews.html.
4. Approve / reject / restore / edit / delete / feature controls.
5. Approved reviews automatically appear on reviews.html and on the homepage.
6. Review emails are kept private and are not displayed publicly.
7. Netlify Blobs stores review records between deployments.
8. A honeypot field is included for basic bot/spam resistance.
9. The review admin password is stored as a Netlify environment variable, not in the website files.

IMPORTANT NETLIFY SETUP
-----------------------
Before publishing, create this Netlify environment variable:

SCALIXOR_ADMIN_PASSWORD=YOUR_STRONG_PRIVATE_PASSWORD

Do NOT put the real password in this README or in any HTML/JS file.

Recommended deployment structure:
- Upload/connect the WHOLE project folder, not just /public.
- Netlify will use netlify.toml.
- Publish directory: public
- Functions directory: netlify/functions
- Dependency: @netlify/blobs

If you use Netlify's dashboard, make sure the site is logged in/connected so Netlify can run the project build and deploy the function.
For the most reliable workflow, connect the project to GitHub or deploy with Netlify CLI.

AFTER DEPLOYMENT
----------------
1. Open your live site.
2. Go to /reviews.html.
3. Submit a test review.
4. Open /admin-reviews.html.
5. Enter the SCALIXOR_ADMIN_PASSWORD value.
6. Approve the test review.
7. Return to /reviews.html and confirm it appears.
8. Confirm it also appears on the homepage.

SECURITY NOTES
--------------
- Use HTTPS on the live domain.
- Use a long, unique admin password.
- Do not share the admin URL/password publicly.
- Review email addresses are stored for moderation and should be handled according to your privacy policy.
- This is a lightweight moderation system suitable for a small business website. If review volume becomes very large, use a dedicated relational database/auth system.

SITE FILES
----------
public/                  Complete public website
public/assets/           CSS, JS and logo assets
netlify/functions/       Review API function
netlify.toml             Netlify build/function configuration
package.json             Netlify Blobs dependency
