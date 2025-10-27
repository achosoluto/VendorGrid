import { AuditLogEntry } from "../AuditLogEntry";

export default function AuditLogEntryExample() {
  return (
    <div className="p-8 bg-background max-w-2xl space-y-4">
      <AuditLogEntry
        action="updated banking information"
        actor="John Doe"
        timestamp="Sep 29, 2025 at 2:45 PM"
        immutable={true}
      />
      <AuditLogEntry
        action="claimed vendor profile"
        actor="Jane Smith"
        timestamp="Sep 28, 2025 at 10:30 AM"
        immutable={true}
      />
    </div>
  );
}
