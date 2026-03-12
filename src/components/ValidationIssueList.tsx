interface ValidationIssueListProps {
  issues: string[];
}

interface ValidationIssueViewModel {
  category: string;
  title: string;
  description: string;
}

function mapValidationIssue(issue: string): ValidationIssueViewModel {
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
