# Vendors and international transfers

This lists each third-party service that receives VineMe users' personal data and the legal route for sending it outside the UK. Agents using the `church-data-protection` skill read this before flagging a vendor (see `.agents/skills/church-data-protection/DATA-LOCATION-AND-TRANSFERS.md`).

- **Transfer route:** UK Extension to the EU-US Data Privacy Framework (DPF), Standard Contractual Clauses (SCCs) with the UK Addendum, International Data Transfer Agreement (IDTA), Binding Corporate Rules (BCRs), or UK/EEA hosting (no restricted transfer).
- Record only what has been checked. Leave a cell blank until someone confirms it, and give the date and who checked.
- Update this file when you add a vendor or a vendor changes its regions, subprocessors or transfer route.

## Recorded

| Vendor | Used for | Region | Transfer route | DPA | Checked |
|---|---|---|---|---|---|
| Vercel | Web hosting, web analytics | | UK Extension to the DPF (active) | | 2026-11-23, checked by Olly |
| Sentry | Error tracking (web and mobile) | | UK Extension to the DPF (active) | | 2026-11-23, checked by Olly |
| Supabase | Database, auth, storage, Edge Functions | | Not on the DPF list; relies on SCCs in its DPA | | 2026-11-23, checked by Olly |
| Twilio (including SendGrid) | Sign-in SMS (via Supabase Auth), email | | Not on the DPF list; relies on Binding Corporate Rules | | 2026-11-23, checked by Olly |

## To confirm

These are used in the repo but haven't been checked yet.

| Vendor | Used for | Region | Transfer route | DPA | Checked |
|---|---|---|---|---|---|
| ChurchSuite | Church management system sync (contacts, vulnerability tags) | | | | |
| Expo | Push notifications (`expo-notifications`) | | | | |
| Mapbox | Maps and geocoding in the mobile app | | | | |
| Google | Maps in the mobile app (`react-native-maps`), Google Fonts in the web build | | | | |
