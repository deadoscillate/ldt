export interface CourseSampleDefinition {
  id: string;
  title: string;
  description: string;
  scenarioType: "security" | "customer service" | "compliance";
  templateDirectory: string;
  courseDirectory: string;
}

export interface CourseSample extends CourseSampleDefinition {
  yaml: string;
  templateDataYaml: string;
  templateReadme: string;
  templateSchemaYaml: string;
  courseReadme: string;
}

export const courseSampleCatalog: CourseSampleDefinition[] = [
  {
    id: "phishing-awareness",
    title: "Phishing awareness",
    description: "Help learners spot phishing signals and choose the safest next step.",
    scenarioType: "security",
    templateDirectory: "phishing-awareness-template",
    courseDirectory: "phishing-awareness-baseline",
  },
  {
    id: "customer-service-scenario",
    title: "Customer service escalation",
    description: "Practice empathetic escalation choices with an upset customer.",
    scenarioType: "customer service",
    templateDirectory: "customer-service-escalation-template",
    courseDirectory: "customer-service-escalation-baseline",
  },
  {
    id: "workplace-harassment-reporting",
    title: "Harassment reporting scenario",
    description: "Guide learners through documentation and reporting decisions.",
    scenarioType: "compliance",
    templateDirectory: "workplace-harassment-reporting-template",
    courseDirectory: "workplace-harassment-reporting-baseline",
  },
  {
    id: "onboarding-checklist",
    title: "Onboarding checklist",
    description: "Guide a new hire through the first branching onboarding decisions.",
    scenarioType: "compliance",
    templateDirectory: "onboarding-checklist-template",
    courseDirectory: "onboarding-checklist-baseline",
  },
  {
    id: "security-awareness-refresher",
    title: "Security awareness refresher",
    description: "Reinforce day-to-day security habits with a short refresher scenario.",
    scenarioType: "security",
    templateDirectory: "security-awareness-refresher-template",
    courseDirectory: "security-awareness-refresher-baseline",
  },
];
