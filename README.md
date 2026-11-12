# CityLives

**CityLives** is an AI-powered road damage detection and civic reporting platform designed to help citizens report infrastructure issues (such as potholes and road damage) and assist municipal authorities in tracking and addressing them efficiently.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite / SQLAlchemy ORM
- **AI / ML:** OpenCV / Computer Vision models for damage detection
- **Authentication:** JWT (JSON Web Tokens) with passlib / bcrypt

### Frontend
- **Framework:** React + TypeScript
- **Tooling:** Vite, Tailwind CSS
- **Icons & UI:** Lucide React / custom components

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📄 License
MIT License
