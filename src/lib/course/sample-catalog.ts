export interface CourseSampleDefinition {
  id: string;
  title: string;
  description: string;
  scenarioType: "security" | "customer service" | "compliance";
  fileName: string;
}

export interface CourseSample extends CourseSampleDefinition {
  yaml: string;
}

export const courseSampleCatalog: CourseSampleDefinition[] = [
  {
    id: "phishing-awareness",
    title: "Phishing awareness",
    description: "Help learners spot phishing signals and choose the safest next step.",
    scenarioType: "security",
    fileName: "phishing-awareness.yaml",
  },
  {
    id: "customer-service-scenario",
    title: "Customer service escalation",
    description: "Practice empathetic escalation choices with an upset customer.",
    scenarioType: "customer service",
    fileName: "customer-service-scenario.yaml",
  },
  {
    id: "workplace-harassment-reporting",
    title: "Harassment reporting scenario",
    description: "Guide learners through documentation and reporting decisions.",
    scenarioType: "compliance",
    fileName: "workplace-harassment-reporting.yaml",
  },
];
