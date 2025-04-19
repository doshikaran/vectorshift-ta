# 🧩 VectorShift Integrations Technical Assessment

This project showcases a complete **HubSpot OAuth 2.0 integration** built using FastAPI and React, as part of the VectorShift Integrations Technical Assessment. 

---

## 🚀 Tech Stack

- **Frontend**: React (Material UI v5)
- **Backend**: FastAPI (Python 3)
- **OAuth**: HubSpot OAuth 2.0 (PKCE Flow)
- **State Management**: Redis (for OAuth states and credentials)
- **Data Sources**: HubSpot Contacts and Companies APIs
- **Bonus Features**: CSV Export, Alert Handling, Responsive UI

---

## ✅ Features Implemented

### 🔐 OAuth Integration (Part 1)

- Implemented endpoints:
  - `authorize_hubspot`
  - `oauth2callback_hubspot`
  - `get_hubspot_credentials`
- Used **PKCE** flow with secure state & code verifier management.
- Stored and retrieved credentials securely in Redis.
- Enabled OAuth UI popup pattern (matching Airtable/Notion behavior).
- Displayed visual connection status with button disabling post-auth.

### 📦 Data Fetch & Render (Part 2)

- Fetched data using `get_items_hubspot()` from:
  - `https://api.hubapi.com/crm/v3/objects/contacts`
  - `https://api.hubapi.com/crm/v3/objects/companies`
- Parsed data into standardized `IntegrationItem` format.
- Rendered:
  - 🧑‍💼 Contact Cards
  - 🏢 Company Cards
- UI Enhancements:
  - CSV Export Button
  - Clear Data Button
  - Error alerts for pre-export/clear before data load

---

## 🖥 UI Preview

- Fully responsive layout with cards for Contacts and Companies
- Features:
  - Hover effects
  - Timestamp rendering
  - Emoji-enhanced summaries
- CSV export triggers `hubspot_contacts.csv` download

---

## 📦 How to Run Locally

### 1️⃣ Redis Server

Make sure Redis is running in the background:
```bash
redis-server
```

### 2️⃣ Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3️⃣ Frontend (React)

```bash
cd frontend
npm install
npm start
```

### 4️⃣ Tunnel (Cloudflare)

To allow HubSpot to access your local server:
```bash
cloudflared tunnel --url http://localhost:8000
```

Use the generated tunnel URL (e.g., `https://your-tunnel.trycloudflare.com/...`) as the **redirect URI** in your [HubSpot Developer Portal](https://developers.hubspot.com/).

---

## 🧪 Testing the Integration

1. Open the UI in your browser.
2. Select **HubSpot** from the integrations dropdown.
3. Click **“Connect to HubSpot”**.
4. Authorize the app when prompted.
5. After connecting:
   - Click **“Load HubSpot Data”** to fetch contacts and companies.
   - Use **“Export CSV”** to download all contacts as a file.
   - Use **“Clear Data”** to reset the loaded data in the UI.

## 🔒 Environment Variables
⚠️ Note: .env files are not included in this repository on purpose.
While I’m aware that using a .env file and adding it to .gitignore is the best practice, I’ve excluded it here for simplicity and transparency during the technical assessment.

---