export interface BlueprintSection {
  title: string;
  points: string[];
}

export interface BlueprintData {
  sections: BlueprintSection[];
  generatedAt: string;
  projectName: string;
}
