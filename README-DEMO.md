# Roshan Technologies CRM — Vercel Demo Mode

This build is completely standalone. It does not connect to the production API, Flask server, PostgreSQL database, or VPS.

## Demo accounts

- Admin: admin@demo.com / admin123
- Manager: manager@demo.com / manager123
- Sales: sales@demo.com / sales123
- Quote Manager: quote@demo.com / quote123

## Data storage

Test data is stored in the browser's localStorage under `roshan_crm_demo_v1`.

To reset all demo data, open browser DevTools → Application/Storage → Local Storage and remove `roshan_crm_demo_v1`, then reload the app.

## Deploy

Upload this folder to a GitHub repository and import it into Vercel. Framework: Other. No build command is required.
