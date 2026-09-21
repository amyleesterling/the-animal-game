export type SavannaSource = { id: string; title: string; url: string };
export type SavannaQuestion = {
  prompt: string;
  choices: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  sourceIds: string[];
};
export type SavannaProfile = {
  id: string;
  name: string;
  scientificName: string;
  group: "Insect" | "Rodent" | "Bird" | "Mammal" | "Reptile";
  aliases: string[];
  summary: string;
  description: string;
  descriptionSourceIds: string[];
  wikipediaUrl: string;
  wikipediaLanguage?: string;
  habitat: string;
  stats: { label: string; value: string; sourceIds: string[] }[];
  questions: SavannaQuestion[];
  sources: SavannaSource[];
  reviewedAt: string;
};
