# Digi Kart Digitals — Mini Live (Test Candidate)

ఈ ZIP అనేది అసలు Digi Kart Mini Live source ఆధారంగా తయారు చేసిన Test Candidate. ఇందులో Leads, Follow-ups, Sale Entry flows మరియు వాటికి అవసరమైన Supabase RPC/Migration ఉన్నాయి.

## ఈ buildలో చేసిన మార్పులు
- Employee Workspaceలో New Lead, Follow-ups, Sale Entry, My Records tabs.
- Lead నమోదు Customer + Lead రెండింటినీ ఒకే SQL RPC transactionలో సృష్టిస్తుంది.
- Sale నమోదు Sale + Sale Item + Service/Installation detailsను ఒకే SQL RPC transactionలో సృష్టిస్తుంది.
- Installation అవసరమైతే `sale_installation_details`లో Address, Contact సేవ్ అవుతాయి.
- Sale Item insert trigger ద్వారా Service Task / Installation Task సృష్టించబడుతుంది.
- Lead-originated salesకు active `product_incentive_rates` ఉంటే 70% Lead Owner, 30% Sale Closer allocations సృష్టించి approval pendingగా ఉంచుతుంది.
- Browser codeలో Supabase anon/publishable key మాత్రమే ఉపయోగించాలి. Service-role key ఎప్పుడూ browserలో పెట్టకూడదు.

## అవసరమైన Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable/anon key మాత్రమే)

## Local / Netlify Build
```bash
npm ci
npm run build
```
Netlify build command: `npm run build`
Publish directory: `dist`

## SQL Migration
`DigiKart_Migration.sql`ను ముందుగా TEST Supabase projectలో మాత్రమే పరిశీలించి అమలు చేయాలి. ఇది స్వయంచాలకంగా అమలు కాదు. Live projectలో apply చేసే ముందు backup, permission/RLS review, test results తప్పనిసరి.

## ముఖ్యమైన పరిమితులు
- ఈ sessionలో npm dependencies install కావడానికి network timeout వచ్చింది. కాబట్టి Vite production build ఇంకా run కాలేదు.
- JSX syntax transpile check మాత్రమే విజయవంతమైంది; ఇది full production buildకు ప్రత్యామ్నాయం కాదు.
- Actual Supabase transaction/RLS testing చేయలేదు.
- Incentive automationకు `product_incentive_rates`లో సరైన product category/name/effective date/rate configure చేసి ఉండాలి.
- Direct walk-in incentive rule, employee-facing service/installation task screens, incentive approval UI ఈ candidateలో పూర్తి కాలేదు.
- Existing `has_permission()` function explicit DENY precedence enforce చేయదు; migration దీన్ని globalగా మార్చదు.

**Status: TEST CANDIDATE — production/live upload approval is not granted by this package.**
