import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AccessLog {
  id: string;
  accessor: string;
  company: string;
  action: string;
  timestamp: string;
}

interface AccessLogTableProps {
  logs: AccessLog[];
}

export function AccessLogTable({ logs }: AccessLogTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Accessor</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} data-testid={`row-access-log-${log.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {log.accessor.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium" data-testid={`text-accessor-${log.id}`}>
                    {log.accessor}
                  </span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-company-${log.id}`}>{log.company}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs" data-testid={`badge-action-${log.id}`}>
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground" data-testid={`text-timestamp-${log.id}`}>
                {log.timestamp}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
