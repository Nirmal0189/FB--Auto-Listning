# FB--Auto-Listning
## AI-Powered Flipkart Auto-Listing System for Parth Plasto Pack Pvt. Ltd.

A full-stack, enterprise-grade integration system built with **Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, and MongoDB/Mongoose** that connects directly to the official **Flipkart Seller/Marketplace API and OAuth 2.0**.

---

## Features

- **Official Flipkart OAuth 2.0 & API Service**: Direct communication via official Flipkart Marketplace endpoints. No web scraping, no browser automation, and zero password storage.
- **Server-Side AES-256-GCM Vault**: Encrypted token storage with proactive automatic token refresh and sensitive credential redaction in all logs and client payloads.
- **Grounded AI Listing Generator**: Generates SEO-optimized product titles, highlights, descriptions, and keywords adhering strictly to factual catalog specifications without hallucinations.
- **14-Field Listing Validator**: Pre-flight validation verifying SKU format, dimensions, package dead weight, price vs. MRP, GST/HSN, HTTPS image accessibility, brand, and legal metrology.
- **Flipkart Customer View Preview**: Accurate preview interface simulating the live Flipkart customer experience with a 0–100 AI Quality Score.
- **Bulk Auto-Listing Engine**: Multi-select table with queue-based, rate-limited batch publishing, individual error tracking, and failure tolerance.
- **Real-Time & Scheduled Sync**: Automatic warehouse inventory and price updates with background cron endpoints (`/api/cron/flipkart-sync`).
- **Dry-Run Simulation Mode**: Safe test mode to simulate and inspect payload generation before pushing live to the marketplace.
- **Activity & Security Audit Trail**: Paginated activity logging with execution duration and secret redaction.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 24)
- MongoDB instance (local or MongoDB Atlas)

### 2. Installation
```bash
git clone https://github.com/Nirmal0189/FB--Auto-Listning.git
cd FB--Auto-Listning
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/parth_plasto_pack
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

FLIPKART_CLIENT_ID=your_flipkart_app_id
FLIPKART_CLIENT_SECRET=your_flipkart_app_secret
FLIPKART_REDIRECT_URI=http://localhost:3000/api/flipkart/callback
FLIPKART_API_BASE_URL=https://api.flipkart.net
FLIPKART_ENVIRONMENT=sandbox # or production
```

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Admin Panel.

### 5. Running Acceptance Tests
```bash
npm test
```

---

## License
Proprietary & Confidential - Parth Plasto Pack Pvt. Ltd.
