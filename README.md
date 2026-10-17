# MockMasterAI

MockMasterAI is a full-stack AI-powered exam generation platform that creates:
- Academic question papers
- Competitive exam mock tests
- CBT-style MCQ tests with instant scoring logic
- Exam-specific configurations for School, Railway, Bank, JEE Mains, IIT Advanced, and General categories

It combines:
- React + Vite frontend for a modern interactive UI
- FastAPI backend for API services and orchestration
- CrewAI + OpenAI for AI-based generation and validation
- Structured question JSON and exam-level metadata for easy frontend consumption

---

## Overview

This project is designed to help users create professional exam content without manually preparing test papers. The workflow is built around an AI-powered generation engine that:
1. Accepts exam metadata from the frontend
2. Validates the request
3. Normalizes exam type/category
4. Calls AI agents to generate exam content
5. Validates generated JSON structure
6. Returns results to the frontend for display and interaction

This is useful for:
- Teachers creating question papers
- Coaching institutes preparing practice sheets
- Students preparing mock tests
- Competitive exam aspirants practicing under timed conditions

---

## Architecture

The repository is split into two primary parts:

- backend/
  - FastAPI application
  - AI orchestration logic
  - exam configs and difficulty rules
  - request validation and async job handling

- frontend/
  - Vite + React application
  - exam dashboard
  - paper generation UI
  - CBT mock test simulator
  - API client and UI state management

High-level architecture:

Client (Browser)
   |
   v
React Frontend
   |
   v
FastAPI Backend
   |
   +--> /generate (paper generation)
   +--> /mock-test (MCQ generation)
   +--> /api/jobs/{id} (async polling)
   |
   v
CrewAI + OpenAI LLM
   |
   v
Validated JSON / Final Exam Content
   |
   v
Frontend renders paper / exam interface

---

## Tech Stack

Frontend
- React 18
- Vite
- React Markdown
- KaTeX support for math rendering
- CSS-based modern UI

Backend
- Python
- FastAPI
- Pydantic validation
- CrewAI
- Python-dotenv
- OpenAI-compatible model access

---

## Project Structure

```text
MockMasterAI/
├── backend/
│   ├── crew_logic.py
│   ├── exam_config.py
│   ├── main.py
│   ├── requirements.txt
│   └── test_backend.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── api/
│       │   └── client.js
│       ├── components/
│       │   ├── CBTMockTest.jsx
│       │   ├── CBTSimulator.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Navbar.jsx
│       │   ├── Palette.jsx
│       │   ├── PaperStudio.jsx
│       │   ├── ResultCard.jsx
│       │   ├── TestConfig.jsx
│       │   └── Timer.jsx
│       └── utils/
│           ├── markdown.js
│           ├── scoring.js
│           └── storage.js
├── .gitignore
└── README.md
```

---

## Backend Design

The backend is designed around a small set of central components:

### 1. exam_config.py
Contains the exam category definitions and scoring metadata.

Supported categories include:
- School
- Railway
- Bank
- JEE Mains
- IIT Advanced
- General

Each exam has:
- marking scheme
- time limit
- default question count
- difficulty levels
- rules prompt for the AI model

### 2. crew_logic.py
This is the actual generation engine.

It includes:
- LLM factory
- result validation
- JSON extraction from AI output
- error handling for malformed model responses
- exam paper generation workflow
- CBT-style mock test generation workflow

The system uses strict validation so that generated questions always follow the expected pattern.

### 3. main.py
This file exposes the FastAPI endpoints.

It supports:
- health checks
- exam metadata retrieval
- paper generation
- mock test generation
- async mock test processing using a background job store

---

## Frontend Design

The frontend is a Vite React application with multiple views:

- Dashboard: landing screen, exam metadata, navigation
- Paper Studio: create and render professional exam papers
- CBT Mock Test: generate and solve timed mock tests

Key frontend flow:
- App loads health and exam metadata from backend
- User chooses exam type and other parameters
- Frontend calls backend API
- Response is rendered into exam UI
- CBT mode tracks answering, marks, timer, and result summary

---

## End-to-End Flow

### 1. Startup
The backend must be running before the frontend can make requests.

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend
```bash
cd frontend
npm install
```

---

### 2. Add environment variables
Create a `.env` file inside `backend/`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
# optional alternative
# OPENAI_MODEL_SETTER=gpt-4o-mini
```

The app loads the environment variables using `python-dotenv` before calling the LLM.

---

### 3. Run backend
```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend exposes:
- `/health`
- `/api/exams`
- `/generate`
- `/mock-test`
- `/api/jobs/{job_id}`

---

### 4. Run frontend
```bash
cd frontend
npm run dev
```

The frontend is configured with a Vite proxy so requests to:
- `/health`
- `/api`
- `/generate`
- `/mock-test`

are forwarded to the backend running on port `8000`.

---

### 5. User selects exam category
The frontend calls:

```http
GET /api/exams
```

This returns:
- supported exam categories
- difficulty list
- default time and question configuration
- marking rules

Example response:
```json
{
  "exams": {
    "Railway": {
      "category": "Competitive",
      "marking": { "correct": 1.0, "negative": 0.33 },
      "default_time_limit": 30,
      "default_questions": 20,
      "allowed_difficulties": ["Easy", "Medium", "Hard"]
    }
  },
  "difficulties": ["Easy", "Medium", "Hard", "Very Hard"]
}
```

---

### 6. Generate question paper
Frontend calls:

```http
POST /generate
```

Example request:
```json
{
  "examCategory": "Railway",
  "subject": "Mathematics",
  "difficulty": "Medium",
  "railwayExam": "RRB NTPC",
  "railwayStage": "CBT-1"
}
```

The backend:
- validates the payload
- normalizes exam type
- picks the exam’s rules
- builds a CrewAI task
- calls the LLM
- reviews the generated paper
- returns final output

The response looks like:
```json
{
  "status": "success",
  "examCategory": "Railway",
  "difficulty": "Medium",
  "paper": "Generated exam paper string..."
}
```

The front-end can then render the generated paper content in a readable format.

---

### 7. Generate mock test
The mock test endpoint is:

```http
POST /mock-test
```

Example request:
```json
{
  "exam_type": "JEE Mains",
  "subject": "Physics",
  "topic": "Electrostatics",
  "difficulty": "Hard",
  "time_limit": 30,
  "questions": 15
}
```

This route:
- validates constraints
- sets default rules from exam profile
- creates a structured question generation job
- ensures each question has:
  - question text
  - four options
  - answer index
  - correct answer text
  - explanation

The backend uses strict parsing to ensure the model output is valid JSON.

---

### 8. Async job flow for long-running mock tests
The frontend can process mock test generation in the background:

```http
POST /mock-test?async_mode=true
```

Response:
```json
{
  "job_id": "uuid-here",
  "status": "queued",
  "check_status_url": "/api/jobs/uuid-here"
}
```

Then the frontend polls:

```http
GET /api/jobs/{job_id}
```

Possible states:
- queued
- processing
- completed
- failed

When completed:
```json
{
  "job_id": "uuid-here",
  "status": "completed",
  "data": {
    "questions": [
      {
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "answer_index": 1,
        "answer": "B",
        "explanation": "..."
      }
    ]
  }
}
```

This prevents frontend timeout problems and is especially useful for larger or slower model generations.

---

## API Reference

### Health
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "app": "MockMaster AI",
  "supported_categories": ["School", "Railway", "Bank", "JEE Mains", "IIT Advanced", "General"]
}
```

---

### Exam Metadata
```http
GET /api/exams
```

Response:
```json
{
  "exams": {
    "School": {
      "category": "Academic",
      "marking": { "correct": 1.0, "negative": 0.0 },
      "default_time_limit": 60,
      "default_questions": 15,
      "allowed_difficulties": ["Easy", "Medium", "Hard"]
    }
  },
  "difficulties": ["Easy", "Medium", "Hard", "Very Hard"]
}
```

---

### Generate Paper
```http
POST /generate
```

#### Request Body
```json
{
  "examCategory": "School",
  "cls": "10",
  "subject": "Science",
  "difficulty": "Medium"
}
```

---

### Generate Mock Test
```http
POST /mock-test
```

#### Request Body
```json
{
  "exam_type": "Railway",
  "subject": "General Intelligence",
  "topic": "Pattern Recognition",
  "difficulty": "Medium",
  "time_limit": 30,
  "questions": 15
}
```

---

## Question Validation Rules

The backend is strict about generated questions.

Each question is validated to ensure:
- question text is meaningful
- exactly 4 options exist
- answer index is valid
- answer text matches the chosen option
- MCQ structure is consistent
- duplicated options are corrected or adjusted

This prevents malformed AI responses from breaking the frontend.

---

## Difficulty Rules

The supported difficulty levels are:
- Easy
- Medium
- Hard
- Very Hard

The app applies category-based constraints:
- JEE Mains cannot be too easy
- IIT Advanced only allows Hard and Very Hard
- School supports Easier to more academic reasoning levels
- Railway and Bank follow competitive exam norms

---

## Core Generation Logic

### Paper Generation
The `generate_paper()` function in `backend/crew_logic.py`:
- identifies exam profile
- chooses exam format prompt
- creates an AI agent for content generation
- creates a reviewer agent to polish quality
- uses a multi-agent Crew to generate a final paper

This allows the system to create:
- descriptive school papers
- competitive exam question formats
- structured mathematical / reasoning-based question sheets

### Mock Test Generation
The `generate_mock_test()` function:
- sets token budget depending on question count
- normalizes difficulty and time parameters
- sends a generation task to the model
- extracts JSON from result
- validates and repairs fields
- returns a final question array and exam metadata

---

## Score and CBT Flow

In the frontend, mock tests are treated as interactive assessments.

Typical CBT flow:
1. User chooses exam + subject + level
2. Backend returns timed mock assessment
3. UI renders each question one by one
4. User answers MCQ
5. System tracks:
   - selected option
   - correct answer
   - score
   - negative marking
   - time left
6. Final result card shows:
   - total questions attempted
   - correct answers
   - wrong answers
   - marks scored
   - time taken

This is implemented with utilities such as:
- `frontend/src/utils/scoring.js`
- `frontend/src/utils/storage.js`

---

## Important Notes

### CORS and Local Development
The backend allows all origins for local testing:
```python
CORSMiddleware(
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Vite Proxy
The frontend dev server proxies requests to the backend:
```js
server: {
  proxy: {
    "/health": "http://127.0.0.1:8000",
    "/api": "http://127.0.0.1:8000",
    "/generate": "http://127.0.0.1:8000",
    "/mock-test": "http://127.0.0.1:8000",
  },
}
```

This means the frontend can call relative API paths without CORS issues during local development.

---

## Troubleshooting

### 1. Backend not running
If the frontend shows:
> Could not reach the backend. Check that it is running on port 8000.

Run:
```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

### 2. OpenAI API key missing
If the backend throws:
> OPENAI_API_KEY is not configured in backend/.env

Add the key to:
```env
backend/.env
```

Example:
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

---

### 3. Model returns malformed JSON
The backend catches invalid LLM responses and raises a generation error with details. This is handled in:
```python
_extract_and_validate_json()
```

It strips markdown fences and tries to extract valid JSON before validating the content.

---

### 4. Frontend loads but no exam data
Check:
- backend is running
- `/api/exams` returns valid JSON
- `OPENAI_API_KEY` is set
- no port conflicts exist on 8000

---

## Recommended Development Workflow

1. Start backend
2. Start frontend
3. Load app in browser
4. Select exam category
5. Generate paper or mock test
6. Review output
7. Use mock CBT timer and answer flow
8. Evaluate scoring and result summary

---

## Example User Journey

### Exam Paper Flow
- Dashboard opens
- User clicks "Generate Question Paper"
- Selects exam category: Railway
- Selects subject: Mathematics
- Selects difficulty: Hard
- Backend creates AI-generated question paper
- Paper is displayed with proper format and instructions

### Mock Test Flow
- User chooses "CBT Mock Test"
- Enters subject: Physics
- Chooses exam: JEE Mains
- Starts timed test
- Answers all questions
- System computes score with negative marking
- Final result is shown in a summary card

---

## Future Enhancements

Possible next improvements include:
- user authentication
- saved results/history
- export to PDF
- database-backed exam sessions
- more robust exam categories
- multi-language support
- admin dashboard for generating paper templates
- persistent exam archives and analytics

---

## License

This repository does not currently show a specific license declaration in the project files reviewed here. If you plan to publish or distribute this project publicly, add an explicit license such as MIT or Apache 2.0.

---

## Summary

MockMasterAI is a complete AI-powered exam generation platform that brings together:
- modern frontend experiences
- FastAPI-based backend architecture
- AI-generated exam papers and mock tests
- structured validation and scoring
- exam-specific rules for multiple categories

It follows a clean end-to-end flow:
User -> Frontend -> FastAPI -> CrewAI/OpenAI -> Validation -> Results -> Frontend Display

This makes it a strong foundation for educational assessment automation and smart exam preparation products.

For local development:
```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# frontend
cd frontend
npm install
npm run dev
```

---
