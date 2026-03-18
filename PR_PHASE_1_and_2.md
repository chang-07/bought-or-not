# Pull Request: Phase 1 & 2 - Backend Infrastructure and Frontend Onboarding

## Description
This pull request introduces the foundational architecture for the Verified Social Pitch Platform (VSPP). It completes Phase 1 (Infrastructure & Data Modeling) and Phase 2 (User Onboarding & SnapTrade Connection).

### Changes Made

**Backend (Django API & Background Workers)**
* Initialized Django project (`vspp`) with SQLite database for MVP.
* Set up core database models: `UserProfile`, `Pitch`, `PitchAttachment`, and `TradeEvent`.
* Configured **Django Ninja** for async API development (`/api/ping`).
* Integrated **Celery & Redis** for background task execution.
* Implemented Django Authentication endpoints (`/api/login`, `/api/signup`, `/api/logout`).
* Integrated SnapTrade python SDK and implemented the endpoint to generate connection portal URLs (`/api/snaptrade/connect`).
* Created a management script to easily spin up a superuser (`create_superuser.py`).
* Configured Django Admin logic to easily view Pitch data and connected authors.

**Frontend (Next.js Application)**
* Initialized Next.js project with Tailwind CSS (v4) and TypeScript.
* Replaced boilerplate UI with a dark mode glassmorphism theme and custom `Outfit` font.
* Built beautiful, modern auth UI for login/signup flows (`src/app/page.tsx`).
* Built the Onboarding component to facilitate connecting brokerage accounts via SnapTrade (`src/app/onboarding/page.tsx`).
* Set up a skeleton Dashboard page ready for the Global Scroll (`src/app/dashboard/page.tsx`).

## Testing Done
* Validated database migrations run cleanly.
* Confirmed Django Ninja swagger UI generates API endpoints properly.
* Tested that `npm run dev` successfully compiles the Next.js frontend with Tailwind configuration and Framer Motion animations. 

## Next Steps
Upon merging, development can proceed to **Phase 3: Pitch Creation & Automated Verification**, including S3 integration and the automated SnapTrade `/holdings` checks.
