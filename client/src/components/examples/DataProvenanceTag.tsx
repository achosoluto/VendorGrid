import { DataProvenanceTag } from "../DataProvenanceTag";

export default function DataProvenanceTagExample() {
  return (
    <div className="p-8 bg-background">
      <DataProvenanceTag
        source="Tax ID Lookup"
        method="AI Agent (Tax ID verification)"
        timestamp="Sep 29, 2025"
      />
    </div>
  );
}
