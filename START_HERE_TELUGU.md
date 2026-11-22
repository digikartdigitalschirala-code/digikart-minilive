# Digi Kart Mini Live – Upload Candidate (V3)

## ముఖ్యమైన స్థితి
ఈ ZIP ఒక React + Vite source project. ఇది పూర్తి Production release కాదు; Demo పరీక్ష కోసం మాత్రమే.

## Netlify build settings
- Base directory: ఖాళీగా ఉంచండి
- Build command: `npm run build`
- Publish directory: `dist`

## Netlify Environment Variables
ఈ రెండు మాత్రమే అవసరం:
- `VITE_SUPABASE_URL` = Digi-Kart-Management-Demo project URL (కేవలం project URL; `/rest/v1/` చివర ఉండకూడదు)
- `VITE_SUPABASE_ANON_KEY` = అదే Demo project యొక్క Publishable key (`sb_publishable_...`)

`service_role` లేదా `sb_secret_...` key ను browser app లేదా Netlify VITE variableలో ఎప్పుడూ పెట్టకండి.

## జాగ్రత్త
- Supabase migration SQL ను ఇప్పుడే Productionలో అమలు చేయకండి. ముందుగా Digi-Kart-Management-Demoకి సరైన backup తీసుకుని, schema/policies పరిశీలించాలి.
- Build, Supabase Auth/RLS, database migration, incentive approval, Direct Walk-in incentive, service/installation workflows అన్నీ end-to-endగా పరీక్షించబడలేదు.
- `BUILD_STATUS_TELUGU.md` లో ఉన్న మిగిలిన పరిమితులను చదవండి.
- GitHub repositoryలో ఈ ZIPలోని project-root files/folders ను repository rootలో upload చేయాలి; ZIP fileనే websiteగా Netlify Dropలో upload చేయకండి.
