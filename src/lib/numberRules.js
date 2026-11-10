// Central rules for numeric inputs: whether decimals are allowed.
// Used both for input restrictions (NumberInput props) and for validation before saving.
export const NUMBER_RULES = {
  age: { label: 'Age', decimal: false },
  gravida: { label: 'Gravidity', decimal: false },
  parity: { label: 'Parity', decimal: false },
  height: { label: 'Height', decimal: true },
  weight: { label: 'Weight', decimal: true },
  bp_systolic: { label: 'Systolic BP', decimal: false },
  bp_diastolic: { label: 'Diastolic BP', decimal: false },
  baby_weight: { label: 'Birth weight', decimal: true },
  tabs: { label: 'Number of tablets', decimal: false },
};

/** Props to spread on a Mantine NumberInput so only valid characters can be typed. */
export const numberInputProps = (key) => {
  const r = NUMBER_RULES[key];
  return {
    allowNegative: false,
    allowDecimal: r.decimal,
    clampBehavior: 'none',
    inputMode: r.decimal ? 'decimal' : 'numeric',
  };
};

/**
 * Returns an error message if the value is not a valid number, or null if it is valid.
 * Empty values are considered valid here (required checks are done separately).
 */
export const validateNumber = (key, value) => {
  if (value === '' || value === null || value === undefined) return null;
  const r = NUMBER_RULES[key];
  const str = String(value).trim();
  const pattern = r.decimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
  if (!pattern.test(str)) return r.decimal ? `${r.label} must be a valid number.` : `${r.label} must be a whole number.`;
  return null;
};
