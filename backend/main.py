"""FastAPI Application for MockMaster AI - Exam & Mock Test Generation Engine."""

import uuid
import time
from typing import Any
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from crew_logic import generate_paper, generate_mock_test, GenerationError
from exam_config import EXAM_CONFIG, DIFFICULTIES
import os

allowed_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "https://mockmasterai.pages.dev").split(",")
    if origin.strip()
]
app = FastAPI(
    title="MockMaster AI",
    description="Intelligent Question Paper and Computer-Based Mock Test Generation API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------
# ASYNC JOB STORE (FOR LONG-RUNNING EXAM GENERATIONS)
# -----------------------------------------------------
_JOBS: dict[str, dict[str, Any]] = {}
_JOB_EXECUTOR = ThreadPoolExecutor(max_workers=4)


def _prune_old_jobs(max_history: int = 100, max_age_seconds: int = 3600):
    """Evicts completed/failed jobs older than 1 hour or if queue exceeds max_history."""
    now = time.time()
    if len(_JOBS) > max_history:
        stale = [k for k, v in _JOBS.items() if now - v.get("created_at", 0) > max_age_seconds]
        for k in stale:
            _JOBS.pop(k, None)


# -----------------------------------------------------
# REQUEST SCHEMAS (WITH STRICT INPUT VALIDATION)
# -----------------------------------------------------
class GenerateRequest(BaseModel):
    examCategory: str = Field(..., description="School, Railway, Bank, JEE Mains, or IIT Advanced")
    cls: str | None = Field(None, max_length=50)
    subject: str | None = Field(None, max_length=100)
    difficulty: str = Field(default="Medium", pattern="^(Easy|Medium|Hard|Very Hard)$")
    railwayExam: str | None = Field(None, max_length=50)
    railwayStage: str | None = Field(None, max_length=50)
    bankExam: str | None = Field(None, max_length=50)
    bankLevel: str | None = Field(None, max_length=50)
    bankSection: str | None = Field(None, max_length=100)


class MockRequest(BaseModel):
    exam_type: str = Field(..., min_length=2, max_length=50, description="e.g. RRB, Bank, JEE Mains, IIT Advanced")
    subject: str = Field(..., min_length=2, max_length=100, description="Subject e.g. Mathematics, Physics")
    topic: str | None = Field(None, max_length=150, description="Optional specific topic focus")
    difficulty: str = Field(default="Medium", pattern="^(Easy|Medium|Hard|Very Hard)$")
    time_limit: int = Field(default=30, ge=1, le=180, description="Time limit in minutes (1 - 180)")
    questions: int = Field(default=15, ge=1, le=40, description="Number of questions (1 - 40 for token cost protection)")


# -----------------------------------------------------
# HEALTH & METADATA ENDPOINTS
# -----------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": "MockMaster AI",
        "supported_categories": list(EXAM_CONFIG.keys()),
    }


@app.get("/api/exams")
def get_supported_exams():
    """Returns centralized exam configurations, scoring rules, and allowed difficulties."""
    return {
        "exams": {
            k: {
                "category": v["category"],
                "marking": v["marking"],
                "default_time_limit": v["default_time_limit"],
                "default_questions": v["default_questions"],
                "allowed_difficulties": v["allowed_difficulties"],
                "sub_exams": v.get("sub_exams", []),
            }
            for k, v in EXAM_CONFIG.items()
        },
        "difficulties": DIFFICULTIES,
    }


# -----------------------------------------------------
# QUESTION PAPER ENDPOINTS
# -----------------------------------------------------
@app.post("/generate")
def generate_question_paper_endpoint(req: GenerateRequest):
    """Generates a professional question paper (printable / CBT document without answers)."""
    try:
        paper = generate_paper(
            exam_category=req.examCategory,
            cls=req.cls,
            subject=req.subject,
            difficulty=req.difficulty,
            railway_exam=req.railwayExam,
            railway_stage=req.railwayStage,
            bank_exam=req.bankExam,
            bank_level=req.bankLevel,
            bank_section=req.bankSection,
        )
        return {
            "status": "success",
            "examCategory": req.examCategory,
            "difficulty": req.difficulty,
            "paper": paper,
        }
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# -----------------------------------------------------
# MOCK TEST ENDPOINTS (SYNC & ASYNC BACKGROUND JOB)
# -----------------------------------------------------
def _run_mock_job(job_id: str, req: MockRequest):
    _JOBS[job_id]["status"] = "processing"
    _JOBS[job_id]["started_at"] = time.time()
    try:
        result = generate_mock_test(
            exam_type=req.exam_type,
            subject=req.subject,
            difficulty=req.difficulty,
            time_limit=req.time_limit,
            questions=req.questions,
            topic=req.topic,
        )
        _JOBS[job_id]["status"] = "completed"
        _JOBS[job_id]["result"] = result
        _JOBS[job_id]["completed_at"] = time.time()
    except Exception as e:
        _JOBS[job_id]["status"] = "failed"
        _JOBS[job_id]["error"] = str(e)
        _JOBS[job_id]["completed_at"] = time.time()


@app.post("/mock-test")
def generate_mock_test_endpoint(
    req: MockRequest,
    async_mode: bool = Query(default=False, description="Set to true to process in background and poll /api/jobs/{id}"),
):
    """Generates an interactive computer-based mock test in structured JSON.
    - async_mode=false (default): blocks and returns the test directly.
    - async_mode=true: returns a job_id immediately so frontend can poll /api/jobs/{job_id} without timeouts.
    """
    if async_mode:
        _prune_old_jobs()
        job_id = str(uuid.uuid4())
        _JOBS[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "created_at": time.time(),
            "request": req.model_dump(),
        }
        _JOB_EXECUTOR.submit(_run_mock_job, job_id, req)
        return {
            "job_id": job_id,
            "status": "queued",
            "check_status_url": f"/api/jobs/{job_id}",
        }

    # Synchronous execution
    try:
        data = generate_mock_test(
            exam_type=req.exam_type,
            subject=req.subject,
            difficulty=req.difficulty,
            time_limit=req.time_limit,
            questions=req.questions,
            topic=req.topic,
        )
        return data
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=f"Mock test generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    """Check the status of a background generation job."""
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response: dict[str, Any] = {
        "job_id": job_id,
        "status": job["status"],
        "created_at": job["created_at"],
    }
    if "started_at" in job:
        response["started_at"] = job["started_at"]
    if "completed_at" in job:
        response["completed_at"] = job["completed_at"]
        response["duration_seconds"] = round(job["completed_at"] - job.get("started_at", job["created_at"]), 2)
    if job["status"] == "completed":
        response["data"] = job["result"]
    elif job["status"] == "failed":
        response["error"] = job.get("error")

    return response


# Backwards compatibility alias
@app.post("/api/generate")
def api_generate_mock_alias(req: MockRequest):
    return generate_mock_test_endpoint(req, async_mode=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
