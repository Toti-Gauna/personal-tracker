/** Sello de tinta, apenas girado, con su marca adentro. Bloqueado: círculo punteado y gris. */
export function Sello({ mark, color, locked, size = 76, label }: { mark: string; color: string; locked?: boolean; size?: number; label: string }) {
  const long = mark.length > 2;
  return (
    <svg className={`sello${locked ? ' bloqueado' : ''}`} width={size} height={size} viewBox="0 0 76 76" role="img" aria-label={`${label}${locked ? ' (bloqueado)' : ''}`} style={locked ? undefined : { ['--c' as string]: color }}>
      <circle cx="38" cy="38" r="36" className="sello-aro" />
      <circle cx="38" cy="38" r="31" className="sello-int" />
      <text x="38" y="38" textAnchor="middle" dominantBaseline="central" className="sello-m" fontSize={long ? 17 : 21} transform="rotate(-8 38 38)">{mark}</text>
    </svg>
  );
}

/** El sello grande de la pantalla de logro: nombre y detalle sobre el aro. */
export function SelloGrande({ name, detail, color }: { name: string; detail: string; color: string }) {
  const words = name.toUpperCase().split(' ');
  const lines = name.length > 9 && words.length === 1 ? [name.toUpperCase().slice(0, Math.ceil(name.length / 2)), name.toUpperCase().slice(Math.ceil(name.length / 2))] : words;
  return (
    <svg className="sello-grande" viewBox="0 0 260 260" role="img" aria-label={`Sello ${name}`} style={{ ['--c' as string]: color }}>
      <circle cx="130" cy="130" r="124" className="sello-aro" />
      <circle cx="130" cy="130" r="108" className="sello-int" />
      <g transform="rotate(-10 130 130)" className="sello-textos">
        <text x="130" y="84" textAnchor="middle" fontSize="13" letterSpacing="3" className="sello-t">★ TRAZO ★</text>
        {lines.map((l, i) => (
          <text key={i} x="130" y={lines.length === 1 ? 140 : 122 + i * 34} textAnchor="middle" fontSize={lines.length === 1 ? 38 : 34} className="sello-m">{l}</text>
        ))}
        <text x="130" y={lines.length === 1 ? 176 : 190} textAnchor="middle" fontSize="13" letterSpacing="2" className="sello-t">{detail.toUpperCase()}</text>
      </g>
    </svg>
  );
}
