"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, idx) => value[idx] ?? "");

  const updateAt = (index: number, nextChar: string) => {
    const next = chars.slice();
    next[index] = nextChar;
    onChange(next.join(""));
  };

  return (
    <div className="flex w-full items-center justify-center gap-2">
      {chars.map((char, index) => (
        <Input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={char}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          className="h-10 w-10 text-center text-base"
          onChange={(event) => {
            const nextChar = event.target.value.replace(/\D/g, "").slice(-1);
            updateAt(index, nextChar);
            if (nextChar && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !chars[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, length) - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
