export function scoreTest(questions, answers, markingScheme) {
  let correct = 0;
  let incorrect = 0;

  questions.forEach((question, index) => {
    const selected = answers[index];
    if (selected === undefined) return;

    if (selected === question.answer_index) correct += 1;
    else incorrect += 1;
  });

  const unanswered = questions.length - correct - incorrect;
  const score = Number(
    (correct * markingScheme.correct - incorrect * markingScheme.negative).toFixed(2),
  );
  const maxScore = Number((questions.length * markingScheme.correct).toFixed(2));
  const attempted = correct + incorrect;

  return {
    correct,
    incorrect,
    unanswered,
    attempted,
    score,
    maxScore,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
  };
}

export function formatMarks(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
