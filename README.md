# AI Return Manager

AI-powered e-commerce return inspection system.

## 🚀 Live Deployments

| Component | Service | Link |
| :--- | :--- | :--- |
| **Frontend App** | Vercel | [https://return-manager-hazel.vercel.app](https://return-manager-hazel.vercel.app) |
| **Backend API** | Render | [https://return-manager-backend.onrender.com](https://return-manager-backend.onrender.com) |
| **API Interactive Docs** | Swagger | [https://return-manager-backend.onrender.com/docs](https://return-manager-backend.onrender.com/docs) |
| **Database & Storage** | Supabase | PostgreSQL + Supabase Storage Bucket |

## Project Structure

```
return manager kiro-edition/
├── ai-return-manager/   ← React + TypeScript + Tailwind frontend
├── backend/             ← Python + FastAPI backend
├── uploads/
│   ├── packing/         ← Packing photos (original reference images)
│   └── returns/         ← Customer return photos
└── .env                 ← Root environment variables (used by backend)
```

## Quick Start

### 1. Configure environment

Edit `.env` in the root folder:

```env
AI_PROVIDER=mock          # mock | openai | anthropic
OPENAI_API_KEY=sk-...     # only needed if AI_PROVIDER=openai
ANTHROPIC_API_KEY=...     # only needed if AI_PROVIDER=anthropic
```

Use `AI_PROVIDER=mock` for local development — no API key needed.

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API is available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### 3. Start the frontend

```bash
cd ai-return-manager
npm install
npm run dev
```

App is available at http://localhost:5173

---

## User Roles

Switch between roles using the tabs in the header.

### Customer
- Browse products and place orders
- View order history
- Request a return with reason + photo

### Packing Manager
- View incoming orders
- Upload packing photo before shipment (becomes the reference image)
- Confirm shipment

### Return Manager
- View all return requests
- Compare original packing photo vs returned product photo
- Run AI inspection (calls the Return Inspection Agent)
- View structured inspection summary with evidence
- Apply final decision: Accept / Manual Review / Reject

---

## AI Architecture

One **Return Inspection Agent** (`backend/agent.py`) with controlled tools:

```
Frontend
   ↓ POST /returns/{id}/inspect
FastAPI (main.py)
   ↓
ReturnInspectionAgent.inspect(return_id)
   ├── get_order()            — DB lookup
   ├── get_product()          — DB lookup
   ├── get_original_image()   — resolve packing photo path
   ├── get_return()           — DB lookup
   ├── analyze_images()       → ai.py (OpenAI / Anthropic / mock)
   ├── check_missing_parts()  — deterministic component check
   ├── get_return_policy()    — deterministic policy rules
   └── create_inspection()    — persist result to DB
```

AI is used only for visual analysis. All data lookups and business logic are deterministic.

---

## Inspection Result

```json
{
  "product_match": true,
  "missing_parts": [],
  "damage": [{"type": "screen_crack", "severity": "high", "confidence": 0.96}],
  "scratches": [{"location": "back_panel", "severity": "minor"}],
  "return_reason_supported": true,
  "damage_level": "HIGH",
  "confidence": 0.94,
  "recommendation": "MANUAL_REVIEW",
  "evidence": [
    "Original screen was intact.",
    "Returned image shows a visible screen crack."
  ]
}
```

The AI recommendation and the final human decision are stored separately.

---

## Switching AI Providers

Change `AI_PROVIDER` in `.env`:

| Value       | Description                          |
|-------------|--------------------------------------|
| `mock`      | Fake result, no API key needed       |
| `openai`    | GPT-4o vision (needs OPENAI_API_KEY) |
| `anthropic` | Claude 3.5 Sonnet (needs key)        |

The `backend/ai.py` abstraction makes it easy to add new providers.

---

## Database

SQLite by default (`return_manager.db` in the backend folder).  
Switch to PostgreSQL by changing `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/return_manager
```
