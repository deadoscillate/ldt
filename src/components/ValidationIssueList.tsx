interface ValidationIssueListProps {
  issues: string[];
}

interface ValidationIssueViewModel {
  category: string;
  title: string;
  description: string;
}

function mapValidationIssue(issue: string): ValidationIssueViewModel {
  const missingFieldMatch = issue.match(
    /^course\.nodes\.(\d+)\.([a-zA-Z0-9]+): This field is required\.$/
  );

  if (missingFieldMatch) {
    const [, rawIndex, fieldName] = missingFieldMatch;
    const stepNumber = Number(rawIndex) + 1;

    return {
      category: "Builder",
      title: "Required field missing",
      description: `Step ${stepNumber} is missing '${fieldName}'. Add that field before compiling again.`,
    };
  }

  const missingAnswerMatch = issue.match(
    /^course\.nodes\.(\d+)\.options: At least (one|two) option[s]? (?:is|required)\.$/
  );

  if (missingAnswerMatch) {
    const [, rawIndex, quantity] = missingAnswerMatch;
    const stepNumber = Number(rawIndex) + 1;

    return {
      category: "Builder",
      title: "Answer choices needed",
      description:
        quantity === "two"
          ? `Step ${stepNumber} needs at least two answer choices before it can be previewed or exported.`
          : `Step ${stepNumber} needs at least one answer choice before it can be previewed or exported.`,
    };
  }

  const questionCorrectMatch = issue.match(
    /^course\.nodes\.(\d+)\.options: (.+correct.+)\.$/i
  );

  if (questionCorrectMatch) {
    const [, rawIndex] = questionCorrectMatch;
    const stepNumber = Number(rawIndex) + 1;

    return {
      category: "Builder",
      title: "Correct answer missing",
      description: `Step ${stepNumber} needs at least one correct answer before it can be scored.`,
    };
  }

  const missingNodeMatch = issue.match(
    /^Node "([^"]+)" references missing node "([^"]+)" via "([^"]+)"\.$/
  );

  if (missingNodeMatch) {
    const [, fromNodeId, toNodeId, edgeLabel] = missingNodeMatch;

    return {
      category: "Reference",
      title: "Broken path",
      description: `Node '${fromNodeId}' references '${toNodeId}' through '${edgeLabel}', but that node does not exist.`,
    };
  }

  const missingPlaceholderMatch = issue.match(
    /^(.+) references missing placeholder "([^"]+)"\.$/
  );

  if (missingPlaceholderMatch) {
    const [, path, placeholderKey] = missingPlaceholderMatch;

    return {
      category: "Template",
      title: "Missing template value",
      description: `Placeholder '${placeholderKey}' is used in ${path}, but it is not defined in templateData.`,
    };
  }

  const duplicateNodeMatch = issue.match(/^Duplicate node id "([^"]+)"\.$/);

  if (duplicateNodeMatch) {
    return {
      category: "Structure",
      title: "Duplicate node id",
      description: `Node id '${duplicateNodeMatch[1]}' is used more than once after block expansion.`,
    };
  }

  const missingStartNodeMatch = issue.match(/^Start node "([^"]+)" does not exist\.$/);

  if (missingStartNodeMatch) {
    return {
      category: "Structure",
      title: "Missing start node",
      description: `The course start node '${missingStartNodeMatch[1]}' does not exist in the expanded course.`,
    };
  }

  if (issue.includes("YAML")) {
    return {
      category: "Syntax",
      title: "YAML syntax issue",
      description: issue,
    };
  }

  const requiredVariableMatch = issue.match(
    /^Template variable "([^"]+)" is required\.$/
  );

  if (requiredVariableMatch) {
    return {
      category: "Template",
      title: "Required variable missing",
      description: `Template variable '${requiredVariableMatch[1]}' still needs a value before this course can compile.`,
    };
  }

  const variableTypeMatch = issue.match(
    /^Template variable "([^"]+)" must be (.+)\.$/
  );

  if (variableTypeMatch) {
    return {
      category: "Template",
      title: "Variable value is invalid",
      description: `Template variable '${variableTypeMatch[1]}' ${variableTypeMatch[2].toLowerCase()}.`,
    };
  }

  return {
    category: "Validation",
    title: "Validation issue",
    description: issue,
  };
}

export function ValidationIssueList({ issues }: ValidationIssueListProps) {
  return (
    <ul className="validation-issue-list">
      {issues.map((issue) => {
        const viewModel = mapValidationIssue(issue);

        return (
          <li className="validation-issue-card" key={issue}>
            <span className="validation-issue-category">{viewModel.category}</span>
            <strong>{viewModel.title}</strong>
            <p>{viewModel.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
