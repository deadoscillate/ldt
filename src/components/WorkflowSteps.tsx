interface WorkflowStepsProps {
  steps: string[];
}

export function WorkflowSteps({ steps }: WorkflowStepsProps) {
  return (
    <div aria-label="Product workflow" className="workflow-strip">
      {steps.map((step, index) => (
        <div className="workflow-item" key={step}>
          <span className="workflow-index">0{index + 1}</span>
          <span className="workflow-label">{step}</span>
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className="workflow-arrow">
              -&gt;
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
