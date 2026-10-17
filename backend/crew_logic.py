"""Business logic for generating exam question papers and interactive mock tests."""

import os
import re
import json
from typing import Any
from dotenv import load_dotenv
from pydantic import BaseModel, field_validator
from crewai import Agent, Task, Crew, LLM
from exam_config import get_exam_profile, normalize_exam_type, DIFFICULTIES

load_dotenv(override=True)


class GenerationError(Exception):
    """Raised when question paper or mock test generation fails validation."""
    pass


# -----------------------------------------------------
# LLM FACTORY (COST & TOKEN CONTROLS)
# -----------------------------------------------------
def _get_llm(temperature: float = 0.3, max_tokens: int = 5000) -> LLM:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise GenerationError("OPENAI_API_KEY is not configured in backend/.env")
    model_name = os.getenv("OPENAI_MODEL_SETTER", os.getenv("OPENAI_MODEL", "gpt-4o-mini")).removeprefix("openai/")
    return LLM(
        model=f"openai/{model_name}",
        base_url="https://api.openai.com/v1",
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )


# -----------------------------------------------------
# DATA MODELS & VALIDATION
# -----------------------------------------------------
class QuestionItem(BaseModel):
    question: str
    options: list[str]
    answer_index: int
    answer: str
    explanation: str = ""

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 5:
            raise ValueError("Question text is too short")
        return s

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: list[str]) -> list[str]:
        cleaned = [str(o).strip() for o in v]
        if len(cleaned) != 4:
            raise ValueError(f"Expected exactly 4 options, got {len(cleaned)}")
        # Auto-adjust duplicates to avoid discarding good questions
        seen = set()
        deduped = []
        for opt in cleaned:
            low = opt.lower()
            if low in seen:
                opt = f"{opt} (alt)"
            seen.add(low)
            deduped.append(opt)
        return deduped

    @field_validator("answer_index", mode="before")
    @classmethod
    def validate_answer_index(cls, v: Any, info) -> int:
        # Direct int
        try:
            val = int(v)
            if 0 <= val <= 3:
                return val
            if 1 <= val <= 4:
                return val - 1
        except (ValueError, TypeError):
            pass

        # Letter
        if isinstance(v, str) and v.strip().upper() in ("A", "B", "C", "D"):
            return "ABCD".index(v.strip().upper())

        # Match option text if model passed the string
        options = info.data.get("options") if hasattr(info, "data") else None
        if options and isinstance(options, list):
            s_val = str(v).strip().lower()
            for idx, opt in enumerate(options):
                opt_str = str(opt).strip().lower()
                if opt_str == s_val or s_val in opt_str or opt_str in s_val:
                    return idx
        return 0


def _extract_and_validate_json(raw: str, expected_min: int = 1) -> dict[str, Any]:
    """Robustly extracts, parses, and validates JSON from LLM output.
    Raises GenerationError with details if response is missing or malformed."""
    text = raw.strip()
    if not text:
        raise GenerationError("Model returned an empty response")

    # Strip markdown fences
    if "```" in text:
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise GenerationError(f"No valid JSON object found in model output: {text[:200]}")

    json_str = text[start : end + 1]
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as err:
        raise GenerationError(f"Malformed JSON from AI model: {err}")

    raw_questions = data.get("questions")
    if not isinstance(raw_questions, list) or len(raw_questions) < expected_min:
        raise GenerationError(
            f"Expected at least {expected_min} questions, but model returned {len(raw_questions) if isinstance(raw_questions, list) else 0}"
        )

    validated_questions = []
    validation_errors = []
    for idx, item in enumerate(raw_questions, 1):
        try:
            q = QuestionItem(**item)
            # Sync answer text with options[answer_index]
            correct_text = q.options[q.answer_index]
            q_dict = q.model_dump()
            q_dict["answer"] = correct_text
            validated_questions.append(q_dict)
        except Exception as e:
            validation_errors.append(f"Q{idx}: {e}")

    if not validated_questions:
        raise GenerationError(f"All generated questions failed validation: {'; '.join(validation_errors[:3])}")

    data["questions"] = validated_questions
    data["total_questions"] = len(validated_questions)
    return data


# =====================================================
# QUESTION PAPER GENERATOR (ACADEMIC / DESCRIPTIVE / CBT)
# =====================================================

def generate_paper(
    exam_category: str,
    cls: str | None = None,
    subject: str | None = None,
    difficulty: str = "Medium",
    railway_exam: str | None = None,
    railway_stage: str | None = None,
    bank_exam: str | None = None,
    bank_level: str | None = None,
    bank_section: str | None = None,
) -> str:
    profile = get_exam_profile(exam_category)
    canonical = profile["canonical_name"]

    if difficulty not in DIFFICULTIES:
        difficulty = "Medium"

    llm = _get_llm(temperature=0.3, max_tokens=5500)

    generator = Agent(
        role="Exam Question Paper Setter",
        goal=f"Create a professional, authentic {difficulty} {exam_category} question paper",
        backstory="Senior academic and competitive board examiner who designs official question papers.",
        llm=llm,
        verbose=False,
    )

    reviewer = Agent(
        role="Examination Board Reviewer",
        goal="Ensure clarity, rubrics, authenticity, and perfect structure",
        backstory="Chief quality reviewer who verifies syllabus adherence and layout standards.",
        llm=_get_llm(temperature=0.1, max_tokens=5500),
        verbose=False,
    )

    # 1. School Paper
    if canonical == "School":
        cls_str = f"Class: {cls}" if cls else "Secondary School Level"
        subj_str = f"Subject: {subject}" if subject else "General Studies"
        description = f"""
        Create a {difficulty} level academic school question paper.
        {cls_str} | {subj_str}

        Format Requirements:
        - Header with School Name placeholder, Class, Subject, Time Allowed ({profile['default_time_limit']} mins), Maximum Marks
        - Clear General Instructions
        - Section A: Short Answer Questions (1-2 marks each)
        - Section B: Medium Analytical Questions (3-4 marks each)
        - Section C: Long Answer / Comprehensive Questions (5-6 marks each)
        - Only questions and marks distribution. Do NOT include answers.
        """

    # 2. Railway Paper
    elif canonical == "Railway":
        exam_name = railway_exam or "RRB NTPC"
        stage_name = railway_stage or "CBT-1"
        description = f"""
        Create a {difficulty} level question paper for {exam_name} ({stage_name}).
        Rules:
        {profile['rules_prompt']}

        Structure:
        - Exam Header with Time Allowed ({profile['default_time_limit']} mins) and Negative Marking (-1/3)
        - Section 1: Mathematics
        - Section 2: General Intelligence & Reasoning
        - Section 3: General Awareness & General Science
        - Exactly 25-30 high-yield MCQs with 4 options each (A, B, C, D).
        - No answers or answer keys.
        """

    # 3. Bank Paper
    elif canonical == "Bank":
        exam_name = bank_exam or "IBPS PO"
        level_name = bank_level or "Prelims"
        sec_name = f"Focus Section: {bank_section}" if bank_section else "Comprehensive (Quant, Reasoning, English)"
        description = f"""
        Create a {difficulty} level {level_name} question paper for {exam_name}.
        {sec_name}
        Rules:
        {profile['rules_prompt']}

        Structure:
        - Header with Instructions and -0.25 Negative Marking
        - 25-30 realistic banking MCQs with 4 distinct options each
        - No answers.
        """

    # 4. JEE Mains
    elif canonical == "JEE Mains":
        subj = subject or "Physics"
        description = f"""
        Create a {difficulty} level JEE Main question paper.
        Subject: {subj}
        Rules:
        {profile['rules_prompt']}

        Pattern:
        - Header: Joint Entrance Examination (JEE) Main | 300 Marks / 3 Hours
        - Section A: 20 Multiple Choice Questions (4 options each, single correct)
        - Section B: 5 Numerical Value Questions (integer/decimal answers, no options)
        - Deep conceptual rigor matching authentic JEE Main papers. No answers.
        """

    # 5. IIT Advanced
    elif canonical == "IIT Advanced":
        subj = subject or "Physics"
        description = f"""
        Create a Very Hard level IIT JEE Advanced question paper.
        Subject: {subj}
        Rules:
        {profile['rules_prompt']}

        Pattern:
        - Header: Indian Institute of Technology (IIT) Advanced
        - Section 1: 6 Single Correct MCQs
        - Section 2: 6 One or More Than One Correct MCQs
        - Section 3: 6 Numerical Answer Type Questions
        - Challenging multi-concept problems for top aspirants. No answers.
        """

    else:
        description = f"""
        Create a {difficulty} level competitive question paper for {exam_category}.
        Rules:
        {profile['rules_prompt']}
        Provide 25 well-crafted MCQs with 4 options each. No answers.
        """

    t_gen = Task(description=description, expected_output="A complete, professional question paper.", agent=generator)
    t_rev = Task(
        description="Verify rubrics, check syllabus consistency, and polish layout.",
        expected_output="Final authenticated exam paper.",
        agent=reviewer,
    )

    crew = Crew(agents=[generator, reviewer], tasks=[t_gen, t_rev], verbose=False)
    result = crew.kickoff()
    output = str(result).strip()
    if not output:
        raise GenerationError("Paper generation produced an empty output")
    return output


# =====================================================
# MOCK TEST GENERATOR (STRUCTURED JSON FOR CBT QUIZ)
# =====================================================

def generate_mock_test(
    exam_type: str,
    subject: str,
    difficulty: str = "Medium",
    time_limit: int | None = None,
    questions: int = 15,
    topic: str | None = None,
) -> dict[str, Any]:
    # Cost & boundary controls
    questions = max(1, min(questions, 40))
    profile = get_exam_profile(exam_type)
    canonical = profile["canonical_name"]

    effective_time_limit = time_limit if time_limit and time_limit > 0 else profile["default_time_limit"]
    effective_difficulty = difficulty if difficulty in DIFFICULTIES else "Medium"

    # Enforce minimum difficulty for premier exams
    if canonical == "JEE Mains" and effective_difficulty == "Easy":
        effective_difficulty = "Medium"
    elif canonical == "IIT Advanced":
        effective_difficulty = "Hard" if effective_difficulty not in ("Hard", "Very Hard") else effective_difficulty

    # Token budget scaling based on question count to protect costs
    budget = min(6500, max(1800, questions * 220))
    llm = _get_llm(temperature=0.3, max_tokens=budget)

    mock_agent = Agent(
        role="CBT Mock Test Author",
        goal=f"Generate authentic {canonical} mock test questions in strict, valid JSON format",
        backstory="Senior question setter for computer-based entrance and recruitment examination platforms.",
        llm=llm,
        verbose=False,
    )

    topic_clause = f"Topic/Domain Focus: '{topic.strip()}'\n" if topic and topic.strip() else ""

    description = f"""
    Create a {effective_difficulty} difficulty CBT Mock Test for {canonical}.

    Subject: {subject}
    {topic_clause}Target Questions: {questions}
    Time Limit: {effective_time_limit} minutes

    Exam Scoring & Pattern Rules:
    {profile['rules_prompt']}
    - Correct Mark: +{profile['marking']['correct']}, Negative Mark: -{profile['marking']['negative']}

    Formatting Directives:
    - Exactly {questions} MCQs.
    - Each question must have exactly 4 distinct options.
    - Put the exact 0-based index (0, 1, 2, or 3) in "answer_index".
    - Put the exact matching text of the correct option in "answer".
    - Include a concise 1-sentence solution in "explanation".

    STRICT OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown fences, no conversational text:
    {{
      "exam_type": "{canonical}",
      "subject": "{subject}",
      "topic": "{topic or 'General'}",
      "difficulty": "{effective_difficulty}",
      "time_limit": {effective_time_limit},
      "marking_scheme": {{"correct": {profile['marking']['correct']}, "negative": {profile['marking']['negative']}}},
      "questions": [
        {{
          "question": "Clear question text?",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "answer_index": 0,
          "answer": "Option 1",
          "explanation": "Why Option 1 is correct."
        }}
      ]
    }}
    """

    task = Task(
        description=description,
        expected_output=f"A valid JSON object containing exactly {questions} structured MCQ questions.",
        agent=mock_agent,
    )

    crew = Crew(agents=[mock_agent], tasks=[task], verbose=False)
    result = crew.kickoff()

    # Validate output with strict error reporting
    parsed = _extract_and_validate_json(str(result), expected_min=1)
    parsed.setdefault("exam_type", canonical)
    parsed.setdefault("subject", subject)
    parsed.setdefault("topic", topic or "General")
    parsed.setdefault("difficulty", effective_difficulty)
    parsed.setdefault("time_limit", effective_time_limit)
    parsed.setdefault("marking_scheme", profile["marking"])
    return parsed
