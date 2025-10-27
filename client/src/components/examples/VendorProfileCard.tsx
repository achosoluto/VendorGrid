import { VendorProfileCard } from "../VendorProfileCard";

export default function VendorProfileCardExample() {
  return (
    <div className="p-8 bg-background max-w-md">
      <VendorProfileCard
        companyName="Acme Corporation"
        taxId="XX-XXX1234"
        address="123 Business St, San Francisco, CA 94105"
        phone="+1 (555) 123-4567"
        email="contact@acme.com"
        status="verified"
      />
    </div>
  );
}
