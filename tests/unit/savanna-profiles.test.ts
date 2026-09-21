import { describe, expect, it } from "vitest";
import { birdProfiles } from "../../src/content/savanna-birds";
import { mammalProfiles } from "../../src/content/savanna-mammals";
import { smallLifeProfiles } from "../../src/content/savanna-small-life";

const profiles = [...smallLifeProfiles, ...birdProfiles, ...mammalProfiles];
const expectedIds = [
  "lamarcks-dung-beetle",
  "mound-building-termite",
  "mopane-emperor-moth",
  "african-monarch",
  "desert-locust",
  "cape-porcupine",
  "south-african-springhare",
  "striped-grass-mouse",
  "naked-mole-rat",
  "secretarybird",
  "lilac-breasted-roller",
  "southern-ground-hornbill",
  "helmeted-guineafowl",
  "grey-crowned-crane",
  "white-backed-vulture",
  "red-billed-oxpecker",
  "marabou-stork",
  "aardvark",
  "bat-eared-fox",
  "banded-mongoose",
  "meerkat",
  "olive-baboon",
  "vervet-monkey",
  "african-buffalo",
  "nile-monitor",
];

describe("the 25-species African savanna expansion", () => {
  it("contains exactly the agreed species and group counts", () => {
    expect(profiles.map((profile) => profile.id).sort()).toEqual(
      [...expectedIds].sort(),
    );
    expect(
      new Set(profiles.map((profile) => profile.scientificName)).size,
    ).toBe(25);
    const counts: Record<string, number> = {};
    for (const profile of profiles)
      counts[profile.group] = (counts[profile.group] ?? 0) + 1;
    expect(counts).toEqual({
      Insect: 5,
      Rodent: 4,
      Bird: 8,
      Mammal: 7,
      Reptile: 1,
    });
  });

  it.each(profiles)(
    "$id has complete readable copy and an exact Wikipedia link",
    (profile) => {
      expect(profile.name.trim()).not.toBe("");
      expect(profile.scientificName).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
      expect(profile.summary.trim()).toMatch(/^[^.!?\n]+[.!?]$/);
      expect(profile.description).not.toMatch(/[\r\n]/);
      const wordCount = profile.description.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(65);
      expect(wordCount).toBeLessThanOrEqual(100);
      expect(profile.habitat.trim()).not.toBe("");
      expect(profile.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(profile.reviewedAt))).toBe(false);
      for (const alias of profile.aliases) expect(alias.trim()).not.toBe("");

      const wiki = new URL(profile.wikipediaUrl);
      expect(wiki.protocol).toBe("https:");
      expect(wiki.hostname).toBe(
        profile.id === "lamarcks-dung-beetle"
          ? "es.wikipedia.org"
          : "en.wikipedia.org",
      );
      expect(wiki.pathname).toMatch(/^\/wiki\/[^/#?]+$/);
      expect(wiki.search).toBe("");
      expect(wiki.hash).toBe("");
      if (profile.id === "lamarcks-dung-beetle")
        expect(profile.wikipediaLanguage).toBe("Spanish");
    },
  );

  it.each(profiles)(
    "$id has sourced facts and three answerable questions",
    (profile) => {
      const sourceIds = new Set(profile.sources.map((source) => source.id));
      expect(sourceIds.size).toBe(profile.sources.length);
      expect(sourceIds.size).toBeGreaterThan(0);
      for (const source of profile.sources) {
        expect(source.id).toMatch(/^[a-z0-9-]+$/);
        expect(source.title.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toMatch(/^https?:$/);
      }
      const references = [profile.descriptionSourceIds];
      expect(profile.stats.length).toBeGreaterThanOrEqual(5);
      expect(profile.stats.length).toBeLessThanOrEqual(7);
      const labels = profile.stats.map((stat) => stat.label.toLowerCase());
      expect(labels.some((label) => /life\s?span/.test(label))).toBe(true);
      expect(labels).toContain("lives");
      expect(labels).toContain("diet");
      expect(labels.some((label) => /(?:^|\s)range$/.test(label))).toBe(true);
      expect(
        labels.some((label) => /size|length|height|wingspan/.test(label)),
      ).toBe(true);
      for (const stat of profile.stats) {
        expect(stat.value.trim()).not.toBe("");
        references.push(stat.sourceIds);
      }

      expect(profile.questions).toHaveLength(3);
      expect(
        new Set(profile.questions.map((question) => question.prompt)).size,
      ).toBe(3);
      for (const question of profile.questions) {
        expect(question.prompt.trim()).toMatch(/\?$/);
        expect(question.choices).toHaveLength(3);
        expect(new Set(question.choices.map((choice) => choice.id)).size).toBe(
          3,
        );
        expect(
          new Set(question.choices.map((choice) => choice.text)).size,
        ).toBe(3);
        for (const choice of question.choices) {
          expect(choice.id).toMatch(/^[a-z0-9-]+$/);
          expect(choice.text.trim()).not.toBe("");
        }
        expect(
          question.choices.some((choice) => choice.id === question.correctId),
        ).toBe(true);
        expect(question.explanation.trim().split(/\s+/).length).toBeGreaterThan(
          5,
        );
        references.push(question.sourceIds);
      }
      for (const ids of references) {
        expect(ids.length).toBeGreaterThan(0);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids)
          expect(sourceIds.has(id), `${profile.id}: ${id}`).toBe(true);
      }
    },
  );

  it("keeps stage, caste, care records and unresolved evidence explicit", () => {
    const stats = (id: string) =>
      profiles
        .find((profile) => profile.id === id)!
        .stats.map((stat) => stat.value)
        .join(" ");
    expect(stats("mound-building-termite")).toContain("laboratory care");
    expect(stats("mopane-emperor-moth")).toContain("Adult stage");
    expect(stats("south-african-springhare")).toContain("Care record");
    expect(stats("striped-grass-mouse")).toContain("Care record");
    expect(stats("lamarcks-dung-beetle")).toContain("not established");
    expect(
      profiles.find((profile) => profile.id === "naked-mole-rat")!.habitat,
    ).toContain("Underground");
  });
});
