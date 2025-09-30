import { SecureFieldInput } from "../SecureFieldInput";
import { useState } from "react";

export default function SecureFieldInputExample() {
  const [value, setValue] = useState("");

  return (
    <div className="p-8 bg-background max-w-md">
      <SecureFieldInput
        label="Bank Account Number"
        value={value}
        onChange={setValue}
        type="text"
        placeholder="Enter account number"
        helperText="Used for payment processing"
      />
    </div>
  );
}
