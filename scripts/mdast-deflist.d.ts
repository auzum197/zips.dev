// Custom mdast node types produced by scripts/sync.mts's remarkZipDeflists
// plugin, which lifts ZIP definition-list syntax (": term" / ": description")
// into a definitionList tree before mdast-util-to-hast runs the matching
// custom handlers.
export {};

declare module "mdast" {
    interface DefinitionList {
        type: "definitionList";
        children: RootContent[];
    }
    interface DefinitionTerm {
        type: "definitionTerm";
        children: PhrasingContent[];
    }
    interface DefinitionDescription {
        type: "definitionDescription";
        children: RootContent[];
    }
    interface RootContentMap {
        definitionList: DefinitionList;
        definitionTerm: DefinitionTerm;
        definitionDescription: DefinitionDescription;
    }
}
