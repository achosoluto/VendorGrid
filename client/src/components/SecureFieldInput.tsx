import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SecureFieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helperText?: string;
}

export function SecureFieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helperText,
}: SecureFieldInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s/g, "-")}>
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-muted-foreground" />
          {label}
        </div>
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s/g, "-")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
      />
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <Alert className="bg-muted/50 border-muted-foreground/20">
        <Lock className="h-4 w-4" />
        <AlertDescription className="text-xs">
          This information is encrypted and securely stored
        </AlertDescription>
      </Alert>
    </div>
  );
}
