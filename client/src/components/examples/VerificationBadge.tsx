import { VerificationBadge } from "../VerificationBadge";

export default function VerificationBadgeExample() {
  return (
    <div className="p-8 space-y-4 bg-background">
      <VerificationBadge status="verified" />
      <VerificationBadge status="pending" />
      <VerificationBadge status="unverified" />
    </div>
  );
}
