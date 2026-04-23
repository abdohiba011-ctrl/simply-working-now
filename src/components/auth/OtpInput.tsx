import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  shaking?: boolean;
  autoFocus?: boolean;
  ariaLabelPrefix?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  shaking,
  autoFocus = true,
  ariaLabelPrefix = "Digit",
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const handleChange = (index: number, raw: string) => {
    const sanitized = raw.replace(/\D/g, "");
    if (!sanitized) {
      const next = [...value];
      next[index] = "";
      onChange(next);
      return;
    }
    if (sanitized.length > 1) {
      const chars = sanitized.slice(0, length - index).split("");
      const next = [...value];
      chars.forEach((c, i) => {
        next[index + i] = c;
      });
      onChange(next);
      const lastIdx = Math.min(index + chars.length, length - 1);
      inputsRef.current[lastIdx]?.focus();
      if (next.join("").length === length && next.every((d) => /^\d$/.test(d))) {
        onComplete?.(next.join(""));
      }
      return;
    }
    const next = [...value];
    next[index] = sanitized;
    onChange(next);
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
    if (next.join("").length === length && next.every((d) => /^\d$/.test(d))) {
      onComplete?.(next.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (pasted.length === length) {
      e.preventDefault();
      const next = pasted.split("");
      onChange(next);
      inputsRef.current[length - 1]?.focus();
      onComplete?.(pasted);
    }
  };

  return (
    <div
      className={cn(
        "flex justify-center gap-2",
        shaking && "animate-[shake_0.4s_ease-in-out]",
      )}
    >
      {Array.from({ length }).map((_, i) => {
        const d = value[i] ?? "";
        return (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`${ariaLabelPrefix} ${i + 1}`}
            className={cn(
              "w-12 h-12 rounded-md border text-center text-xl font-semibold outline-none transition-all",
              "focus:ring-2",
              d ? "bg-[#9FE870]/5" : "bg-white",
            )}
            style={{
              borderColor: d ? "#9FE870" : "rgba(22,51,0,0.15)",
              color: "#163300",
            }}
          />
        );
      })}
    </div>
  );
}
