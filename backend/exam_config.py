"""Centralized examination profiles, scoring rules, and constraints for MockMaster AI."""

from typing import Any

DIFFICULTIES = ["Easy", "Medium", "Hard", "Very Hard"]

EXAM_CONFIG: dict[str, dict[str, Any]] = {
    "School": {
        "category": "Academic",
        "marking": {"correct": 1.0, "negative": 0.0},
        "default_time_limit": 60,
        "default_questions": 15,
        "allowed_difficulties": ["Easy", "Medium", "Hard"],
        "rules_prompt": (
            "- Standard school curriculum format\n"
            "- No negative marking\n"
            "- Graded difficulty appropriate for class and subject\n"
            "- Distinct sections for short, medium, and long answer questions (if descriptive)"
        ),
    },
    "Railway": {
        "category": "Competitive",
        "sub_exams": ["RRB NTPC", "RRB Group D", "RRB ALP", "RRB JE"],
        "marking": {"correct": 1.0, "negative": 0.33},
        "default_time_limit": 30,
        "default_questions": 20,
        "allowed_difficulties": ["Easy", "Medium", "Hard"],
        "rules_prompt": (
            "- 4 distinct options per MCQ with exactly one correct answer\n"
            "- Negative marking: -0.33 (1/3rd) for every wrong answer\n"
            "- Focus on Mathematics, General Intelligence & Reasoning, General Awareness & Science\n"
            "- Calculations must be exact with clean options"
        ),
    },
    "Bank": {
        "category": "Competitive",
        "sub_exams": ["IBPS PO", "IBPS Clerk", "SBI PO", "SBI Clerk", "RBI Assistant"],
        "marking": {"correct": 1.0, "negative": 0.25},
        "default_time_limit": 30,
        "default_questions": 20,
        "allowed_difficulties": ["Easy", "Medium", "Hard"],
        "rules_prompt": (
            "- Professional banking exam format (IBPS / SBI style)\n"
            "- 4 distinct options per MCQ with single correct option\n"
            "- Negative marking: -0.25 (1/4th) for every incorrect answer\n"
            "- Tricky distractors, data interpretation, arithmetic, and verbal reasoning"
        ),
    },
    "JEE Mains": {
        "category": "Engineering Entrance",
        "marking": {"correct": 4.0, "negative": 1.0},
        "default_time_limit": 60,
        "default_questions": 25,
        "allowed_difficulties": ["Medium", "Hard"],
        "rules_prompt": (
            "- JEE Main National Testing Agency (NTA) standard\n"
            "- Scoring: +4 for correct, -1 for wrong\n"
            "- Conceptual depth, multi-step problem solving\n"
            "- Single correct option MCQs"
        ),
    },
    "IIT Advanced": {
        "category": "Engineering Entrance",
        "marking": {"correct": 4.0, "negative": 1.0},
        "default_time_limit": 60,
        "default_questions": 18,
        "allowed_difficulties": ["Hard", "Very Hard"],
        "rules_prompt": (
            "- IIT JEE Advanced examination rigor\n"
            "- Marking: +4 for correct, -1 for wrong\n"
            "- Multi-concept integration, deep analytical reasoning\n"
            "- Challenging top 1% competitive exam standard"
        ),
    },
    "General": {
        "category": "General Competition",
        "marking": {"correct": 1.0, "negative": 0.25},
        "default_time_limit": 30,
        "default_questions": 15,
        "allowed_difficulties": ["Easy", "Medium", "Hard"],
        "rules_prompt": (
            "- 4 options per question with exactly one correct option\n"
            "- Standard competitive exam pattern\n"
            "- +1 for correct answer, -0.25 for incorrect answer"
        ),
    },
}


def normalize_exam_type(raw_type: str) -> str:
    """Maps various user inputs (e.g. 'RRB', 'rrb ntpc', 'banking') to canonical config keys."""
    t = raw_type.strip().lower()
    if "railway" in t or "rrb" in t:
        return "Railway"
    if "bank" in t or "ibps" in t or "sbi" in t or "rbi" in t:
        return "Bank"
    if "advance" in t or "iit" in t:
        return "IIT Advanced"
    if "jee" in t or "mains" in t:
        return "JEE Mains"
    if "school" in t or "cbse" in t or "icse" in t:
        return "School"
    for canonical in EXAM_CONFIG:
        if canonical.lower() == t:
            return canonical
    return "General"


def get_exam_profile(exam_type: str) -> dict[str, Any]:
    canonical = normalize_exam_type(exam_type)
    return {
        "canonical_name": canonical,
        **EXAM_CONFIG[canonical],
    }
