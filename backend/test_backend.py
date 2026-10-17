"""Unit tests for MockMaster AI backend.
Tests validation, prompt inputs, malformed provider responses, and generator failures
WITHOUT making real AI calls ($0 cost, runs in < 1 second).
"""

import unittest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from exam_config import normalize_exam_type, get_exam_profile, EXAM_CONFIG
from crew_logic import (
    QuestionItem,
    _extract_and_validate_json,
    GenerationError,
    generate_mock_test,
)
from main import MockRequest, GenerateRequest


class TestExamConfig(unittest.TestCase):
    def test_exam_normalization(self):
        self.assertEqual(normalize_exam_type("RRB NTPC"), "Railway")
        self.assertEqual(normalize_exam_type("rrb group d"), "Railway")
        self.assertEqual(normalize_exam_type("IBPS PO"), "Bank")
        self.assertEqual(normalize_exam_type("sbi clerk"), "Bank")
        self.assertEqual(normalize_exam_type("JEE Mains"), "JEE Mains")
        self.assertEqual(normalize_exam_type("iit advanced"), "IIT Advanced")
        self.assertEqual(normalize_exam_type("cbse 10th"), "School")
        self.assertEqual(normalize_exam_type("Random Exam"), "General")

    def test_profile_scoring_rules(self):
        railway = get_exam_profile("RRB")
        self.assertEqual(railway["marking"]["negative"], 0.33)

        bank = get_exam_profile("Bank")
        self.assertEqual(bank["marking"]["negative"], 0.25)

        jee = get_exam_profile("JEE Mains")
        self.assertEqual(jee["marking"]["correct"], 4.0)
        self.assertEqual(jee["marking"]["negative"], 1.0)


class TestRequestValidation(unittest.TestCase):
    def test_valid_mock_request(self):
        req = MockRequest(
            exam_type="RRB",
            subject="Mathematics",
            topic="Time and Work",
            difficulty="Medium",
            time_limit=30,
            questions=10,
        )
        self.assertEqual(req.questions, 10)
        self.assertEqual(req.topic, "Time and Work")

    def test_cost_control_rejects_excessive_questions(self):
        with self.assertRaises(ValidationError):
            MockRequest(
                exam_type="RRB",
                subject="Math",
                questions=100,  # Max is 40
            )

    def test_rejects_negative_or_zero_questions(self):
        with self.assertRaises(ValidationError):
            MockRequest(exam_type="RRB", subject="Math", questions=0)

    def test_rejects_invalid_difficulty(self):
        with self.assertRaises(ValidationError):
            MockRequest(
                exam_type="RRB",
                subject="Math",
                difficulty="Extreme",  # Invalid
            )

    def test_rejects_invalid_time_limit(self):
        with self.assertRaises(ValidationError):
            MockRequest(exam_type="RRB", subject="Math", time_limit=0)


class TestJSONExtractionAndValidation(unittest.TestCase):
    def test_clean_json_extraction(self):
        raw = '{"questions": [{"question": "What is 2+2?", "options": ["1", "2", "3", "4"], "answer_index": 3, "answer": "4"}]}'
        data = _extract_and_validate_json(raw)
        self.assertEqual(data["total_questions"], 1)
        self.assertEqual(data["questions"][0]["answer"], "4")

    def test_markdown_fence_stripping(self):
        raw = """```json
        {
            "questions": [
                {
                    "question": "Capital of France?",
                    "options": ["Berlin", "London", "Paris", "Rome"],
                    "answer_index": 2,
                    "answer": "Paris"
                }
            ]
        }
        ```"""
        data = _extract_and_validate_json(raw)
        self.assertEqual(data["total_questions"], 1)
        self.assertEqual(data["questions"][0]["answer_index"], 2)

    def test_conversational_prefix_and_suffix(self):
        raw = """Here is your mock test as requested:
        {
            "questions": [
                {
                    "question": "Which gas is needed for photosynthesis?",
                    "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
                    "answer_index": 2,
                    "answer": "Carbon Dioxide"
                }
            ]
        }
        Hope this helps! Good luck!"""
        data = _extract_and_validate_json(raw)
        self.assertEqual(data["total_questions"], 1)

    def test_malformed_json_raises_explicit_generation_error(self):
        raw = "Not a JSON string at all"
        with self.assertRaises(GenerationError) as ctx:
            _extract_and_validate_json(raw)
        self.assertIn("No valid JSON", str(ctx.exception))

    def test_empty_questions_raises_explicit_generation_error(self):
        raw = '{"questions": []}'
        with self.assertRaises(GenerationError) as ctx:
            _extract_and_validate_json(raw, expected_min=1)
        self.assertIn("Expected at least 1 questions", str(ctx.exception))

    def test_question_item_normalizes_letter_answer_index(self):
        q = QuestionItem(
            question="What is the chemical symbol for Gold?",
            options=["Ag", "Au", "Fe", "Cu"],
            answer_index="B",  # Letter instead of int
            answer="Au",
        )
        self.assertEqual(q.answer_index, 1)

    def test_question_item_deduplicates_duplicate_options(self):
        q = QuestionItem(
            question="Which planet is known as the Red Planet?",
            options=["Mars", "Venus", "Mars", "Jupiter"],  # Duplicate "Mars"
            answer_index=0,
            answer="Mars",
        )
        self.assertEqual(len(q.options), 4)
        self.assertEqual(q.options[2], "Mars (alt)")


class TestMockGeneratorFlow(unittest.TestCase):
    @patch("crew_logic.Crew.kickoff")
    def test_generator_successful_flow(self, mock_kickoff):
        # Mock LLM response with 2 questions
        mock_kickoff.return_value = MagicMock(
            raw=None,
            __str__=lambda s: """
            {
                "questions": [
                    {
                        "question": "Sample Question 1?",
                        "options": ["A", "B", "C", "D"],
                        "answer_index": 0,
                        "answer": "A",
                        "explanation": "Exp 1"
                    },
                    {
                        "question": "Sample Question 2?",
                        "options": ["W", "X", "Y", "Z"],
                        "answer_index": 1,
                        "answer": "X",
                        "explanation": "Exp 2"
                    }
                ]
            }
            """,
        )

        result = generate_mock_test(
            exam_type="RRB",
            subject="Mathematics",
            topic="Speed and Distance",
            difficulty="Medium",
            time_limit=20,
            questions=2,
        )

        self.assertEqual(result["exam_type"], "Railway")
        self.assertEqual(result["total_questions"], 2)
        self.assertEqual(result["topic"], "Speed and Distance")
        self.assertEqual(result["time_limit"], 20)
        self.assertEqual(result["marking_scheme"]["correct"], 1.0)
        self.assertEqual(result["marking_scheme"]["negative"], 0.33)

    @patch("crew_logic.Crew.kickoff")
    def test_generator_raises_explicit_error_on_model_failure(self, mock_kickoff):
        mock_kickoff.return_value = MagicMock(
            raw=None,
            __str__=lambda s: "Sorry, I cannot generate this test.",
        )

        with self.assertRaises(GenerationError):
            generate_mock_test(
                exam_type="Bank",
                subject="Reasoning",
                questions=5,
            )


if __name__ == "__main__":
    unittest.main()
