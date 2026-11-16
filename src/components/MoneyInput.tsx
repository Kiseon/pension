import React, { useEffect, useState } from "react";
import { formatCompactKrw, formatKrw, parseMoneyInput } from "../utils/format";

interface MoneyInputProps {
  id?: string;
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  onNullableChange?: (value: number | null) => void;
  nullable?: boolean;
  placeholder?: string;
  hint?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onNullableChange,
  nullable = false,
  placeholder,
  hint
}) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() =>
    value === null ? "" : formatKrw(value)
  );

  useEffect(() => {
    if (!focused) {
      setText(value === null ? "" : formatKrw(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = e.target.value;
    setText(nextRaw);
    if (nullable && nextRaw.trim() === "") {
      onNullableChange?.(null);
      return;
    }
    const parsed = parseMoneyInput(nextRaw);
    if (nullable && onNullableChange) {
      onNullableChange(parsed);
    } else {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (nullable && text.trim() === "") {
      setText("");
      return;
    }
    const parsed = parseMoneyInput(text);
    setText(formatKrw(parsed));
  };

  const numericDisplay = value ?? 0;

  return (
    <label className="field" htmlFor={id}>
      <span className="field-header">
        <span className="field-label">{label}</span>
        {numericDisplay !== 0 && (
          <span className="field-unit-badge">{formatCompactKrw(numericDisplay)}</span>
        )}
      </span>
      <div className="input-affix">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          className="input-control tabular-nums"
        />
        <span className="affix-text">원</span>
      </div>
      {hint && <span className="field-hint-text">{hint}</span>}
    </label>
  );
};
