import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DataProvenanceTagProps {
  source: string;
  method: string;
  timestamp: string;
}

export function DataProvenanceTag({ source, method, timestamp }: DataProvenanceTagProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20"
          data-testid="badge-provenance"
        >
          {source} • {timestamp}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">Verified by {method}</p>
      </TooltipContent>
    </Tooltip>
  );
}
