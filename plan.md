# Project Plan: Verified Social Pitch Platform (VSPP)

## 1. Executive Summary

VSPP is a professional social network for equity research and trade execution. It solves the "signal vs. noise" problem in retail investing by requiring authors to verify their "Skin in the Game" via SnapTrade before a pitch is published. Users can scroll through pitches, view verified P&L performance, and execute trades directly within the platform.

---

## 2. Technical Stack

* **Backend:** Django (Django Ninja for Async API performance)
* **Frontend:** Next.js (React) + Tailwind CSS
* **Database:** PostgreSQL (with Trigram search for discovery)
* **Task Queue:** Celery + Redis (for background workers and polling)
* **File Storage:** Amazon S3 (for PDF/PPTX pitch decks)
* **Brokerage Integration:** SnapTrade API (Read/Write access using Alpaca for demo)
* **Market Data API:** Finnhub or Yahoo Finance (Generous free tier for live pricing and charts)

---

## 3. Core Database Models

### UserProfile

* `user`: ForeignKey to Django Auth User.
* `snaptrade_user_id`: UUID for SnapTrade API identification.
* `snaptrade_secret`: Encrypted API secret.
* `total_alpha`: Cumulative performance vs. S&P 500.
* `win_rate`: Percentage of "Successful" pitches (Price Target hit).

### Pitch

* `ticker`: String (e.g., "AAPL").
* `entry_price`: Decimal (Actual cost basis/average price of the author's holding at moment of publishing).
* `target_price`: Decimal (Author's predicted exit price).
* `is_verified`: Boolean (Checked via SnapTrade `/holdings`).
* `content_body`: Markdown text for the summary.
* `status`: Choice (Active, Closed, Target Hit).

### PitchAttachment

* `pitch`: ForeignKey to Pitch.
* `file_url`: S3 URL for PDF or PPTX.
* `file_type`: String (e.g., "application/pdf").

### TradeEvent (Attribution)

* `reader`: User who executed a trade based on a pitch.
* `pitch`: The specific pitch that triggered the trade.
* `order_id`: The SnapTrade-returned ID for the execution.
* `revenue_generated`: Amount earned by the author (Tips/Platform Fee).

---

## 4. Key Workflows

### A. The "Verified Pitch" Upload (Long Only)

1. **Drafting:** Author enters Ticker, Target Price, and uploads a PDF/PPTX pitch deck.
2. **Verification Trigger:** Upon "Submit," a Celery task calls the SnapTrade `/holdings` API for the author's connected account.
3. **Position Validation:** If the author holds the Ticker, the Pitch is marked as `is_verified=True`.
4. **Baseline Pricing:** The system extracts the `average_price` or `cost_basis` from the SnapTrade `/holdings` payload to accurately track the author's real historic P&L and sets this as the `entry_price`.
5. **Persistence:** PDF/PPTX is moved to S3; Pitch is added to the Global Scroll.

### B. Discovery & The Global Scroll

* **Infinite Scroll Feed:** A unified feed of pitches showing:
  * Ticker.
  * "Verified" Badge (if applicable).
  * Author's current Alpha/Success score.
  * Preview of the Pitch PDF.
* **Search Engine:** Users can search for specific Users, Tickers, or Sectors using PostgreSQL fuzzy search.

### C. 1-Click Execution (Copy-Trade)

1. **Intent:** Reader clicks the "Trade" button on a pitch card.
2. **Pre-Trade Check (Trade Impact):** The app calls SnapTrade's `/trade/impact` to verify the reader's buying power. Explicit error messages are shown if the user lacks sufficient funds to execute the trade.
3. **Market Hours & Queuing:** If the trade is placed outside of standard market hours, a warning is displayed. The user is then asked if they want to queue the order for market open (Supported across SnapTrade-compatible brokerages, utilizing Alpaca for the demo).
4. **Confirmation:** Reader confirms the order.
5. **Order Placement:** The app calls SnapTrade's `/trade/place` to execute the trade in the reader's brokerage.
6. **Logging:** The trade is logged in the `TradeEvent` table for attribution.

---

## 5. Dashboards

### I. Pitch Progress Dashboard (For Authors/Readers)

* **Real-time Alpha:** A live chart comparing the Pitch's performance vs. the S&P 500 since the `entry_price` was set.
* **Status Tracker:** Visual progress bar toward the `target_price`.
* **Position Alerts:** Notifications if the author sells their position (automatically closing the pitch).

### II. Revenue & Analytics Dashboard (For Authors)

* **Monetization Tracking:** View revenue earned from "Tips" or "Premium Pitch" unlocks (PDF access).
* **AUM Following:** Total dollar volume of trades executed by readers based on the author's pitches.
* **Engagement Stats:** Total views, PDF downloads, and conversion rates (Scroll -> Trade).

### III. Portfolio Dashboard (For Readers/Investors)

* **Holdings Snapshot:** Syncs with SnapTrade to display the user's current connected brokerage portfolio.
* **Sell Execution:** Users cannot short when discovering pitches, but they can sell their existing long holdings directly from this dashboard to realize gains/losses.

---

## 6. API Mapping & External Services

| Feature | Service / Endpoint |
| :--- | :--- |
| **Brokerage Onboarding** | SnapTrade `POST /login` (Connection Portal) |
| **Identity/Verification** | SnapTrade `GET /holdings` (Check Author position & cost basis) |
| **Market Data & Charts** | Finnhub or Yahoo Finance API |
| **Pre-Trade Estimate** | SnapTrade `POST /trade/impact` (Verify reader funds) |
| **Execution/Queuing** | SnapTrade `POST /trade/place` |
| **Post-Trade Sync** | SnapTrade `GET /orders` |

---

## 7. Implementation Phases

* **Phase 1:** Setup Django/S3 infra and SnapTrade Connection Portal.
* **Phase 2:** Implement the Pitch Upload workflow with automated `/holdings` verification and Market Data API integration.
* **Phase 3:** Build the Global Feed with Infinite Scroll and Search.
* **Phase 4:** Develop the 1-Click Execution logic, queuing system, and Portfolio Dashboard for selling.
* **Phase 5:** Build Performance and Revenue Dashboards with real-time analytics.

---

## 8. Compliance & Security

* **Security:** Use SnapTrade's managed UI for credentials; encrypt all API secrets in the DB.
* **Legal Disclaimers:** Every pitch contains a mandatory "Not Financial Advice" disclaimer.
* **Privacy:** Use signed S3 URLs to ensure only authorized users can view premium PDF/PPTX attachments.
