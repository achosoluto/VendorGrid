import { AccessLogTable } from "../AccessLogTable";

const mockLogs = [
  {
    id: "1",
    accessor: "Sarah Johnson",
    company: "Global Manufacturing Inc",
    action: "Viewed Profile",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    accessor: "Michael Chen",
    company: "Tech Solutions LLC",
    action: "Downloaded Data",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    accessor: "Emma Williams",
    company: "Enterprise Systems Corp",
    action: "Viewed Profile",
    timestamp: "1 day ago",
  },
];

export default function AccessLogTableExample() {
  return (
    <div className="p-8 bg-background">
      <AccessLogTable logs={mockLogs} />
    </div>
  );
}
