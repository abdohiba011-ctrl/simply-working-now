import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  showIcon?: boolean;
  error?: boolean;
}

// Format phone number for display: 06 XX XX XX XX or 07 XX XX XX XX
const formatPhoneDisplay = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Handle Moroccan phone numbers
  let phoneDigits = digits;
  
  // If it starts with country code, remove it
  if (digits.startsWith("212")) {
    phoneDigits = "0" + digits.slice(3);
  } else if (digits.startsWith("+212")) {
    phoneDigits = "0" + digits.slice(4);
  }
  
  // Format as 0X XX XX XX XX
  if (phoneDigits.length <= 2) return phoneDigits;
  if (phoneDigits.length <= 4) return `${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2)}`;
  if (phoneDigits.length <= 6) return `${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4)}`;
  if (phoneDigits.length <= 8) return `${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4, 6)} ${phoneDigits.slice(6)}`;
  return `${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 4)} ${phoneDigits.slice(4, 6)} ${phoneDigits.slice(6, 8)} ${phoneDigits.slice(8, 10)}`;
};

// Clean phone number for storage (with country code)
const cleanPhoneForStorage = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  
  // If starts with 0, replace with +212
  if (digits.startsWith("0")) {
    return "+212" + digits.slice(1);
  }
  
  // If starts with 212, add +
  if (digits.startsWith("212")) {
    return "+" + digits;
  }
  
  // If it's already formatted with country code
  if (value.startsWith("+212")) {
    return "+212" + digits.replace(/^212/, "");
  }
  
  // Default: assume Moroccan number
  if (digits.length === 9 && (digits.startsWith("6") || digits.startsWith("7") || digits.startsWith("5"))) {
    return "+212" + digits;
  }
  
  return value;
};

// Validate Moroccan phone number — tolerant of stored formats like
// "+212...", "00212...", "212...", "0...", or 9-digit local without leading 0.
const isValidMoroccanPhone = (value: string): boolean => {
  if (!value) return false;
  // Normalize Arabic-Indic / full-width digits to ASCII before stripping
  const ascii = value.replace(/[\u0660-\u0669]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48),
  );
  let digits = ascii.replace(/\D/g, "");

  // Drop international prefixes
  if (digits.startsWith("00212")) digits = digits.slice(5);
  else if (digits.startsWith("212")) digits = digits.slice(3);

  // Add the leading 0 if it's a 9-digit national number
  if (digits.length === 9 && /^[567]/.test(digits)) {
    digits = "0" + digits;
  }

  return /^0[567]\d{8}$/.test(digits);
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, showIcon = true, error, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    
    // Update display value when value prop changes
    useEffect(() => {
      setDisplayValue(formatPhoneDisplay(value));
    }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Only allow digits and spaces
      const cleaned = input.replace(/[^\d\s]/g, "");
      const digitsOnly = cleaned.replace(/\s/g, "");
      
      // Limit to 10 digits for Moroccan numbers
      if (digitsOnly.length > 10) return;
      
      // Format for display
      setDisplayValue(formatPhoneDisplay(digitsOnly));
      
      // Send cleaned value to parent
      if (onChange) {
        onChange(cleanPhoneForStorage(digitsOnly));
      }
    };
    
    const isValid = !value || isValidMoroccanPhone(value);
    
    return (
      <div className="relative">
        {showIcon && (
          <>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
              <Phone className={cn(
                "h-4 w-4 transition-colors shrink-0",
                isFocused ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-sm font-medium whitespace-nowrap",
                isFocused ? "text-foreground" : "text-muted-foreground"
              )}>
                +212
              </span>
            </div>
            <div className="absolute left-[4.75rem] top-1/2 -translate-y-1/2 h-5 w-px bg-border pointer-events-none" />
          </>
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            showIcon && "pl-[5.5rem]",
            !isValid && value && "border-destructive focus-visible:ring-destructive",
            error && "border-destructive focus-visible:ring-destructive",
            "ltr-content tracking-wide",
            className
          )}
          placeholder="06 XX XX XX XX"
          {...props}
        />
        {value && !isValid && (
          <p className="text-xs text-destructive mt-1">
            Invalid Moroccan phone number
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { isValidMoroccanPhone, cleanPhoneForStorage, formatPhoneDisplay };
