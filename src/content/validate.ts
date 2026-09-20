import { assets, zebra } from "./species";
import type { AssetDefinition, NarratedFact, Species } from "./types";

/** Returns actionable authoring errors; no user content is rendered before this succeeds. */
export function validateContent(
  speciesList: Species[] = [zebra],
  assetList: AssetDefinition[] = assets,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const text = (value: unknown): boolean =>
    typeof value === "string" && value.trim().length > 0;
  const date = (value: unknown): boolean =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value));
  const id = (value: unknown, label: string): void => {
    if (!text(value)) {
      errors.push(`${label}: missing ID`);
      return;
    }
    if (seen.has(value as string))
      errors.push(`${label}: duplicate ID ${value}`);
    seen.add(value as string);
  };
  const assetIds = new Set(assetList.map((asset) => asset.id));
  for (const asset of assetList) {
    id(asset.id, "asset");
    if (!text(asset.alt))
      errors.push(`${asset.id}: missing accessible description`);
    if (asset.kind === "procedural" && !text(asset.implementation))
      errors.push(`${asset.id}: missing procedural implementation reference`);
  }
  for (const species of speciesList) {
    id(species.id, "species");
    const sourceIds = new Set(species.sources.map((source) => source.id));
    const sourceRefs = (ids: string[], label: string): void => {
      if (!Array.isArray(ids) || ids.length === 0) {
        errors.push(`${label}: factual content needs a source`);
        return;
      }
      for (const sourceId of ids)
        if (!sourceIds.has(sourceId))
          errors.push(`${label}: unknown source ${sourceId}`);
    };
    for (const source of species.sources) {
      id(source.id, "source");
      if (!text(source.title) || !text(source.publisher))
        errors.push(`${source.id}: missing source details`);
      if (!/^https:\/\//.test(source.url))
        errors.push(`${source.id}: source must have an HTTPS URL`);
      if (!date(source.lastReviewed))
        errors.push(`${source.id}: missing review date`);
    }
    if (
      !text(species.commonName) ||
      !text(species.scientificName) ||
      !text(species.pronunciation)
    )
      errors.push(`${species.id}: missing name or pronunciation`);
    if (!date(species.lastReviewed))
      errors.push(`${species.id}: missing review date`);
    sourceRefs(species.taxonomySourceIds, `${species.id} taxonomy`);
    const checkFact = (fact: NarratedFact): void => {
      id(fact.id, "fact");
      if (!text(fact.text)) errors.push(`${fact.id}: missing text`);
      if (!text(fact.narration)) errors.push(`${fact.id}: missing narration`);
      if (!date(fact.lastReviewed))
        errors.push(`${fact.id}: missing review date`);
      sourceRefs(fact.sourceIds, fact.id);
    };
    [
      species.introduction,
      species.summary,
      ...species.stats,
      ...species.adaptations,
      ...species.ecologicalRole,
    ].forEach(checkFact);
    if (species.quizzes.length !== 3)
      errors.push(`${species.id}: exactly three questions are required`);
    for (const [index, question] of species.quizzes.entries()) {
      id(question.id, "question");
      if (question.kind !== ["spot", "understand", "connect"][index])
        errors.push(
          `${question.id}: questions must follow spot, understand, connect order`,
        );
      if (!text(question.prompt) || !text(question.explanation))
        errors.push(`${question.id}: missing prompt or explanation`);
      if (!text(question.narration) || !text(question.narrationExplanation))
        errors.push(`${question.id}: missing narration`);
      if (!date(question.lastReviewed))
        errors.push(`${question.id}: missing review date`);
      sourceRefs(question.sourceIds, question.id);
      if (question.choices.length !== 3)
        errors.push(`${question.id}: exactly three choices are required`);
      for (const choice of question.choices) {
        id(choice.id, "choice");
        if (!text(choice.text) || !text(choice.narration))
          errors.push(`${choice.id}: missing choice text or narration`);
      }
      if (
        !question.choices.some(
          (choice) => choice.id === question.correctChoiceId,
        )
      )
        errors.push(`${question.id}: correct answer is not a defined choice`);
    }
    if (!assetIds.has(species.model.assetId))
      errors.push(
        `${species.id}: undefined model asset ${species.model.assetId}`,
      );
    if (species.audio.callAssetId && !assetIds.has(species.audio.callAssetId))
      errors.push(
        `${species.id}: undefined call asset ${species.audio.callAssetId}`,
      );
    if (species.audio.narration !== "browser-speech")
      errors.push(`${species.id}: unsupported narration provider`);
    const positiveValues = [
      species.model.scale,
      species.model.bodyLength,
      species.model.bodyHeight,
      species.model.bodyWidth,
      species.spawn.roamRadius,
      ...Object.values(species.behaviors),
    ];
    if (positiveValues.some((value) => !Number.isFinite(value) || value <= 0))
      errors.push(
        `${species.id}: model, spawn and behavior values must be positive`,
      );
    if (species.behaviors.comfortRadius >= species.behaviors.encounterRadius)
      errors.push(`${species.id}: no comfortable encounter distance`);
    if (
      [species.spawn.position, ...species.spawn.herdOffsets].some(
        (position) =>
          position.length !== 3 ||
          position.some((value) => !Number.isFinite(value)),
      )
    )
      errors.push(`${species.id}: invalid spawn position`);
  }
  return errors;
}

export function assertValidContent(): void {
  const errors = validateContent();
  if (errors.length)
    throw new Error(`Content validation failed:\n${errors.join("\n")}`);
}
