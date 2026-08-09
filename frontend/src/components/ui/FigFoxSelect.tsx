import { CaretDown, Check } from "@phosphor-icons/react";
import { Select } from "@base-ui/react/select";

type SelectOption<Value extends string> = {
  value: Value;
  label: string;
};

type FigFoxSelectProps<Value extends string> = {
  value: Value;
  options: readonly SelectOption<Value>[];
  onValueChange: (value: Value) => void;
  ariaLabel: string;
  name?: string;
  disabled?: boolean;
  className?: string;
};

export function FigFoxSelect<Value extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  name,
  disabled = false,
  className = "",
}: FigFoxSelectProps<Value>) {
  return (
    <Select.Root
      value={value}
      items={options}
      name={name ?? ariaLabel}
      inputRef={(input) => {
        if (input) input.setAttribute("aria-label", ariaLabel);
      }}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue) onValueChange(nextValue);
      }}
    >
      <Select.Trigger
        className={`ff-select-trigger ${className}`.trim()}
        aria-label={ariaLabel}
      >
        <Select.Value />
        <Select.Icon className="ff-select-icon">
          <CaretDown size={14} weight="bold" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="ff-select-positioner"
          sideOffset={7}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="ff-select-popup">
            <Select.List className="ff-select-list">
              {options.map((option) => (
                <Select.Item
                  className="ff-select-item"
                  value={option.value}
                  key={option.value}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="ff-select-check">
                    <Check size={14} weight="bold" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
