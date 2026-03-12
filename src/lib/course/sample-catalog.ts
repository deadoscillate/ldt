export interface CourseSampleDefinition {
  id: string;
  title: string;
  description: string;
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
    fileName: "phishing-awareness.yaml",
  },
  {
    id: "customer-service-scenario",
    title: "Customer service escalation",
    description: "Practice empathetic escalation choices with an upset customer.",
    fileName: "customer-service-scenario.yaml",
  },
  {
    id: "workplace-harassment-reporting",
    title: "Harassment reporting scenario",
    description: "Guide learners through documentation and reporting decisions.",
    fileName: "workplace-harassment-reporting.yaml",
  },
];
