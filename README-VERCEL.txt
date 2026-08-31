Roshan Technologies CRM - Vercel Frontend

Recommended setup
1. Deploy this folder as the Vercel project root.
2. Framework Preset: Other
3. Build Command: leave empty
4. Output Directory: leave empty
5. Install Command: leave empty
6. Add the custom domain crm.roshantech.cloud to this Vercel project.

The frontend API is already configured in shared/config.js as:
https://api.roshantech.cloud/api

Important
The Flask backend currently permits CORS only from https://crm.roshantech.cloud.
Using that exact custom domain on Vercel means no backend CORS change is required.
If you use the default *.vercel.app domain instead, update the backend CORS allowed origins first.
