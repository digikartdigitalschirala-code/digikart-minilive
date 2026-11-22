# Digi Kart Mini Live – Demo Test Upload Guide

## ముఖ్యమైనది
ఈ ZIP Test Candidate మాత్రమే. Vite Production Build, PostgreSQL migration execution, Supabase Auth/RLS integration పరీక్షలు ఇంకా పూర్తికాలేదు. Production Netlify site లేదా Production Supabase projectలో upload/run చేయకండి.

## ఇప్పటికే ఉన్న Demoనే ఉపయోగించండి
కొత్త Demo project సృష్టించవద్దు. మీ వద్ద ఉన్న Demo Netlify site మరియు దానికి కనెక్ట్ అయిన Demo Supabase project వివరాలు తీసుకుని ముందుగా వాటిని నిర్ధారించాలి.

## Demo Netlifyలో deploy చేయడానికి ముందు
1. Netlifyలో ప్రస్తుతం ఉన్న Demo siteను తెరవండి.
2. Site settingsలో Build command `npm run build`, Publish directory `dist`గా ఉందో చూడండి.
3. Environment variablesలో `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` రెండూ Demo Supabase projectవేనా నిర్ధారించండి.
4. Production site లేదా Production Supabase URL/keys అయితే ఆపండి.
5. ఈ Candidate ZIPలోని `.env` లేదా credentials లేవు. `.env.example` నమూనా మాత్రమే.

## SQL
`DigiKart_Migration_v3.sql`ను ముందుగా Demo Supabase SQL Editorలో కూడా వెంటనే Run చేయకండి. మొదట schema exportతో పోల్చి, Demo project schema అదే versionనా నిర్ధారించాలి. SQL transactionలో ఉన్నా, schema/permission assumptions తప్పైతే migration విఫలమవచ్చు.

## ఉద్యోగుల Test Checklist (Demoలో అనుమతి ఇచ్చిన తర్వాత మాత్రమే)
- ఉద్యోగి Login
- New Lead create
- అదే Leadకు Follow-up create
- Follow-up Completedగా mark
- Lead Owner / helper access
- Sale Entry
- Service Call Required / Installation Required వివరాలు
- Installation Task కనిపించడం, Claim చేయడం
- ఇతర ఉద్యోగి అనుమతి లేని Lead/Sale చూడలేకపోవడం

## Credentials భద్రత
- Service role keyను Netlify client environment variableగా పెట్టకండి.
- Public anon/publishable key మాత్రమే browserలో వాడాలి.
- నిజమైన customer dataతో మొదటి పరీక్ష చేయకండి; Demo customer records వాడండి.
