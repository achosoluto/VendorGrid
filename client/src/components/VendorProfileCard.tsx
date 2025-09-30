import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VerificationBadge } from "./VerificationBadge";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VendorProfileCardProps {
  companyName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  status: "verified" | "pending" | "unverified";
}

export function VendorProfileCard({
  companyName,
  taxId,
  address,
  phone,
  email,
  status,
}: VendorProfileCardProps) {
  return (
    <Card className="hover-elevate" data-testid="card-vendor-profile">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold" data-testid="text-company-name">
              {companyName}
            </h3>
          </div>
          <Badge variant="outline" className="font-mono text-xs" data-testid="text-tax-id">
            Tax ID: {taxId}
          </Badge>
        </div>
        <VerificationBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
          <span className="text-muted-foreground" data-testid="text-address">{address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground" data-testid="text-phone">{phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground" data-testid="text-email">{email}</span>
        </div>
      </CardContent>
    </Card>
  );
}
