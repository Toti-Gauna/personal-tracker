interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  id?: string;
}

/** Casilla de cuaderno. */
export function Casilla({ checked, onChange, label, id }: Props) {
  return (
    <button type="button" role="checkbox" id={id} className="casilla" aria-checked={checked} aria-label={label} onClick={onChange}>
      {checked && (
        <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" /></svg>
      )}
    </button>
  );
}
