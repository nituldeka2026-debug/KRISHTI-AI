# Krishti AI V21 Upgrade Pack

This pack upgrades the supplied V20.1 project without replacing its existing UI.

## Added
- V21 plan definitions: Free / Pro Monthly / Pro Yearly
- Server-side monthly usage ledger
- `/api/v21/usage` endpoint
- `/api/v21/consume` endpoint for backend-enforced quotas
- `/api/v21/plan` endpoint for admin plan assignment
- Professional plan + usage UI
- V21 integration notes

## Important production note
The included JSON ledger is for development/small deployments. For a real Play Store launch with many users, move usage/subscription state to Firestore/PostgreSQL and verify Google Play subscriptions server-side.

## Integration
`v21/v21-client.js` is loaded by `index.html`. Add `data-v21-account` to any existing Profile/Plan button to open the panel.

The backend routes are inserted into `server.js` and use the existing Firebase authentication middleware.

## Windows / Android
V20.1 is a web/PWA project. This V21 pack keeps that foundation. Android can be packaged for Play Store after production PWA/app-wrapper configuration; Windows can use the web app/PWA or a desktop wrapper. This pack does not falsely claim that a native Windows binary or Play Store AAB has already been built.
