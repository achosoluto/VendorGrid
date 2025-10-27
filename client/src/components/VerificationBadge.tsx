import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type VerificationStatus = "verified" | "pending" | "unverified";

interface VerificationBadgeProps {
  status: VerificationStatus;
}

export function VerificationBadge({ status }: VerificationBadgeProps) {
  const variants = {
    verified: {
      icon: CheckCircle2,
      label: "Verified",
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    unverified: {
      icon: XCircle,
      label: "Unverified",
      className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
    },
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={variant.className} data-testid={`badge-verification-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {variant.label}
    </Badge>
  );
}
