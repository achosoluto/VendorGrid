import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock } from "lucide-react";

interface AuditLogEntryProps {
  action: string;
  actor: string;
  timestamp: string;
  immutable?: boolean;
}

export function AuditLogEntry({ action, actor, timestamp, immutable = true }: AuditLogEntryProps) {
  return (
    <div className="flex items-start gap-4 pb-4 border-l-2 border-border pl-4 relative" data-testid="container-audit-entry">
      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
      <Avatar className="w-8 h-8 mt-1">
        <AvatarFallback className="text-xs">
          {actor.split(" ").map(n => n[0]).join("").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm" data-testid="text-actor">{actor}</span>
          <span className="text-muted-foreground text-sm">{action}</span>
          {immutable && (
            <Lock className="w-3 h-3 text-muted-foreground" data-testid="icon-immutable" />
          )}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-timestamp">{timestamp}</p>
      </div>
    </div>
  );
}
