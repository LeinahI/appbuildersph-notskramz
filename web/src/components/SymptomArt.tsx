import type { ReactNode } from 'react';

/**
 * Picture for a symptom card. A photo named `<symptom id>.webp` (or .jpg/.jpeg/.png) in `src/assets/symptoms/` wins;
 * without one the card shows the flat drawing below, which ships inside the app so it works with no signal.
 */
const PHOTOS = import.meta.glob('../assets/symptoms/*.{webp,jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const PHOTO_BY_ID = new Map(
  Object.entries(PHOTOS).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, ''), url] as const),
);

const C = {
  bg: '#f1f5eb',
  leaf: '#5d9a52',
  leafDark: '#2b603e',
  leafLight: '#a9cf8c',
  straw: '#e3c04a',
  brown: '#8b5a2b',
  rust: '#b4672a',
  soil: '#8a6a45',
  water: '#b9dbe6',
  ink: '#26392d',
  pink: '#e8508a',
  gold: '#d9a62e',
  cream: '#f6f0d8',
  frass: '#c9a46a',
};

const BLADE = 'M8 104 C40 40 100 24 152 22 C122 62 70 98 8 104Z';
const MIDRIB = 'M8 104 C60 70 110 40 150 24';

function Bug({ x, y, s = 1, r = 0, color = C.brown }: { x: number; y: number; s?: number; r?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g stroke={C.ink} strokeWidth='1' strokeLinecap='round'>
        <path d='M-3 2 L-6 7M0 3 L0 8M3 2 L6 7M-3 -2 L-6 -7M0 -3 L0 -8M3 -2 L6 -7M8 -1 L12 -4M8 1 L12 4' fill='none' />
      </g>
      <ellipse rx='8' ry='4.5' fill={color} />
      <circle cx='8' cy='0' r='3' fill={color} />
      <circle cx='9.2' cy='-1' r='.8' fill={C.ink} />
    </g>
  );
}

function Larva({ x, y, s = 1, r = 0, color = '#9cc06a' }: { x: number; y: number; s?: number; r?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={i * 5} cy={0} r={4.2 - i * 0.15} fill={color} stroke={C.ink} strokeWidth='.7' />
      ))}
      <circle cx='-3' cy='0' r='3.6' fill='#7a4a24' />
    </g>
  );
}

function Blade({ children, d = BLADE, rib = MIDRIB, fill = C.leaf }: { children?: ReactNode; d?: string; rib?: string; fill?: string }) {
  return (
    <>
      <path d={d} fill={fill} />
      <path d={rib} fill='none' stroke={C.leafDark} strokeWidth='1.6' strokeLinecap='round' opacity='.7' />
      {children}
    </>
  );
}

function Water() {
  return <path d='M0 96 Q20 92 40 96 T80 96 T120 96 T160 96 V120 H0Z' fill={C.water} />;
}

function Soil() {
  return <path d='M0 94 Q40 88 80 94 T160 92 V120 H0Z' fill={C.soil} />;
}

/** A rice panicle hanging off a stalk that starts at (x, 120). */
function Panicle({ x, tip = 22, color = C.straw, droop = 14, grainFill }: { x: number; tip?: number; color?: string; droop?: number; grainFill?: string }) {
  const grains = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { gx: x + droop * t * t + (i % 2 ? 3 : -3), gy: tip + 8 + t * 40 };
  });
  return (
    <g>
      <path d={`M${x} 120 L${x} ${tip + 4} Q${x + 2} ${tip - 6} ${x + droop} ${tip + 4}`} fill='none' stroke={C.leafDark} strokeWidth='2.2' strokeLinecap='round' />
      {grains.map((g, i) => (
        <ellipse key={i} cx={g.gx + droop * 0.5} cy={g.gy} rx='2.4' ry='4' fill={grainFill ?? color} stroke={grainFill ? '#b9a96a' : undefined} strokeWidth={grainFill ? 0.9 : undefined} transform={`rotate(${i % 2 ? 20 : -20} ${g.gx + droop * 0.5} ${g.gy})`} />
      ))}
    </g>
  );
}

function Diamond({ x, y, r = -35, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <polygon points='-12,0 0,-5.5 12,0 0,5.5' fill={C.brown} />
      <polygon points='-6,0 0,-2.4 6,0 0,2.4' fill='#d9d3c0' />
    </g>
  );
}

/** Symptom ids that have their own drawing. The rest get a plain leaf. */
export const SCENE_IDS = (): string[] => Object.keys(SCENES);

/** True when there is a photo or a drawing for this problem, so a card can show a reference picture instead of a plain leaf. */
export const hasSymptomArt = (id: string): boolean => PHOTO_BY_ID.has(id) || id in SCENES;

const SCENES: Record<string, () => ReactNode> = {
  'rice-blast': () => (
    <Blade>
      <Diamond x={44} y={86} />
      <Diamond x={76} y={64} s={1.15} />
      <Diamond x={108} y={44} />
    </Blade>
  ),
  'bacterial-leaf-blight': () => (
    <Blade>
      <path d='M18 102 C44 100 58 92 72 88 C84 84 90 74 104 70 C118 64 126 50 142 32' fill='none' stroke={C.straw} strokeWidth='7' strokeLinecap='round' strokeDasharray='16 4' />
      <path d='M118 58 C130 46 140 34 150 24' fill='none' stroke={C.brown} strokeWidth='6' strokeLinecap='round' opacity='.75' />
    </Blade>
  ),
  'rice-leaffolder': () => (
    <Blade>
      <path d='M20 100 C60 74 100 50 144 28' fill='none' stroke={C.leafDark} strokeWidth='9' strokeLinecap='round' opacity='.35' />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${40 + i * 24} ${88 - i * 14} l14 -9`} stroke='#fff' strokeWidth='3' strokeLinecap='round' />
      ))}
    </Blade>
  ),
  'rice-whorl-maggot': () => (
    <Blade>
      {[[34, 92], [52, 82], [70, 72], [88, 60], [106, 48]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx='2.6' ry='2' fill={C.bg} stroke={C.brown} strokeWidth='.8' />
      ))}
      <path d='M24 100 C60 92 108 62 136 34' fill='none' stroke='#fff' strokeWidth='3' strokeLinecap='round' strokeDasharray='10 6' />
    </Blade>
  ),
  'downy-mildew': () => (
    <Blade fill='#6fa55a'>
      {[-9, 0, 9].map((o) => (
        <path key={o} d={`M12 ${104 + o * 0.4} C62 ${72 + o} 110 ${42 + o} 146 ${26 + o * 0.5}`} fill='none' stroke={o === 0 ? '#f4efb0' : '#e9e4a0'} strokeWidth='4' strokeLinecap='round' opacity='.9' />
      ))}
    </Blade>
  ),
  'fall-armyworm': () => (
    <g>
      <path d='M80 116 C58 80 34 56 12 40 C48 44 74 66 86 100Z' fill={C.leaf} />
      <path d='M80 116 C104 78 128 54 150 38 C114 44 88 66 78 100Z' fill='#6fa55a' />
      <path d='M80 116 C74 84 78 52 80 22 C90 52 92 84 84 116Z' fill={C.leafLight} />
      {[[38, 56], [118, 54], [56, 76]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx='5' ry='3.4' fill={C.bg} stroke={C.brown} strokeWidth='1' transform={`rotate(${i * 25 - 20} ${x} ${y})`} />
      ))}
      {[[78, 62], [83, 68], [75, 70], [81, 76], [86, 60], [79, 82]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r='2.2' fill={C.frass} />
      ))}
      <Larva x={92} y={46} s={0.95} r={-25} color='#8aae58' />
    </g>
  ),
  'corn-armyworm': () => (
    <g>
      <path d='M14 108 C58 76 104 48 148 28' fill='none' stroke={C.leafLight} strokeWidth='5' strokeLinecap='round' />
      {[[34, 94], [58, 80], [84, 62], [110, 46], [132, 34]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l${i % 2 ? 8 : -8} ${i % 2 ? -14 : 14} l${i % 2 ? 3 : -3} ${i % 2 ? 6 : -6}Z`} fill={C.leaf} />
      ))}
      <Larva x={64} y={98} s={0.95} r={-30} color='#a3a85a' />
    </g>
  ),
  'green-leafhopper': () => (
    <g>
      <g opacity='.45'>
        <path d='M30 116 C26 80 30 52 40 28 C44 54 44 84 38 116Z' fill={C.leaf} />
        <path d='M42 116 C46 82 54 58 66 38 C62 62 56 88 50 116Z' fill={C.leaf} />
      </g>
      <path d='M82 116 C78 98 80 86 86 78 C88 90 90 102 90 116Z' fill='#e0a53a' />
      <path d='M92 116 C94 100 100 90 108 84 C106 96 102 106 100 116Z' fill='#d98a2b' />
      <path d='M72 116 C66 104 66 94 70 86 C74 96 78 106 80 116Z' fill='#e8c45a' />
      <Bug x={128} y={74} s={1.4} r={-20} color='#6fbf4a' />
    </g>
  ),
  'corn-planthopper': () => (
    <g>
      <path d='M60 116 C40 90 30 66 24 40 C54 62 70 88 74 116Z' fill='#3f5b3a' />
      <path d='M76 116 C86 88 104 64 134 46 C124 76 108 98 98 116Z' fill='#4d6b3f' />
      {[[48, 78], [112, 70], [96, 94], [38, 60]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx='4' ry='3' fill='#cfe3d4' opacity='.85' />
          <ellipse cx={x - 1} cy={y - 1} rx='1.2' ry='.8' fill='#fff' />
        </g>
      ))}
      <Bug x={84} y={62} s={0.8} r={-10} color='#b79a6a' />
      <Bug x={64} y={100} s={0.8} r={20} color='#b79a6a' />
    </g>
  ),
  'rice-caseworm': () => (
    <g>
      <Water />
      <path d='M10 76 C40 40 82 30 112 36 L104 46 L110 52 L100 58 C70 62 36 70 10 76Z' fill={C.leaf} />
      <path d='M10 76 C50 54 84 44 108 42' fill='none' stroke={C.leafDark} strokeWidth='1.5' opacity='.6' />
      <g transform='translate(112 100) rotate(-12)'>
        <path d='M-16 0 C-10 -9 10 -9 18 -2 L18 2 C10 9 -10 9 -16 0Z' fill='#b9965a' stroke={C.brown} strokeWidth='1' />
        <path d='M-6 -6 V6M2 -7 V7M10 -6 V6' stroke={C.brown} strokeWidth='.8' />
      </g>
    </g>
  ),
  bph: () => (
    <g>
      <Water />
      {[34, 52, 70, 88, 106, 124].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 98 C${x - 3} 70 ${x - 8} 48 ${x - 14 + (i % 2) * 6} 28`} fill='none' stroke='#b88a4a' strokeWidth='3' strokeLinecap='round' />
          <path d={`M${x - 2} 66 C${x + 10} 56 ${x + 16} 52 ${x + 22} 50`} fill='none' stroke='#a8743a' strokeWidth='2.4' strokeLinecap='round' />
        </g>
      ))}
      {[[44, 90], [60, 86], [78, 92], [96, 88], [112, 91], [70, 80], [52, 78], [102, 78]].map(([x, y], i) => (
        <Bug key={i} x={x} y={y} s={0.55} r={(i * 47) % 360} color={C.brown} />
      ))}
    </g>
  ),
  'rice-black-bug': () => (
    <g>
      <Water />
      {[40, 70, 100, 128].map((x, i) => (
        <path key={x} d={`M${x} 98 C${x - 4} 70 ${x - 8} 46 ${x - 16 + i * 3} 26`} fill='none' stroke={C.rust} strokeWidth='3.4' strokeLinecap='round' />
      ))}
      <path d='M40 70 C28 56 18 50 8 48' fill='none' stroke='#c47a3a' strokeWidth='3' strokeLinecap='round' />
      <path d='M100 66 C112 54 124 48 140 46' fill='none' stroke='#c47a3a' strokeWidth='3' strokeLinecap='round' />
      <g transform='translate(76 78) rotate(-80)'>
        <path d='M-9 0 C-9 -6 -3 -7 4 -6 C11 -4 11 4 4 6 C-3 7 -9 6 -9 0Z' fill='#1d2a22' />
        <circle cx='10' cy='0' r='3' fill='#1d2a22' />
      </g>
    </g>
  ),
  'golden-apple-snail': () => (
    <g>
      <Water />
      <path d='M52 96 L52 62 M52 62 l-6 -8' stroke={C.leaf} strokeWidth='3.4' strokeLinecap='round' fill='none' />
      <path d='M52 62 l-1 3 l3 -1Z' fill={C.leaf} />
      {[[88, 42], [96, 48], [86, 52], [94, 58], [102, 40], [104, 54], [84, 62], [92, 68]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r='4.2' fill={C.pink} stroke='#b8346a' strokeWidth='.8' />
      ))}
      <path d='M94 96 L94 36' stroke={C.leafDark} strokeWidth='3' strokeLinecap='round' />
      <g transform='translate(130 94)'>
        <circle r='13' fill={C.gold} stroke='#a37a1c' strokeWidth='1.2' />
        <path d='M0 0 m0 -2 a2 2 0 1 1 -2 2 a5 5 0 1 1 5 5 a8.5 8.5 0 1 1 -8.5 -8.5' fill='none' stroke='#a37a1c' strokeWidth='1.4' strokeLinecap='round' />
      </g>
    </g>
  ),
  'stem-borer': () => (
    <g>
      <Panicle x={40} droop={16} color={C.leafLight} />
      <Panicle x={118} droop={-16} tip={26} color={C.leafLight} />
      <path d='M80 120 L80 18' stroke='#e7e0b8' strokeWidth='2.4' strokeLinecap='round' />
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx={80 + (i % 2 ? 3 : -3)} cy={22 + i * 5} rx='2.4' ry='4' fill={C.cream} stroke='#d8cf9f' strokeWidth='.8' />
      ))}
    </g>
  ),
  'rice-bug': () => (
    <g>
      <Panicle x={62} droop={18} grainFill={C.cream} />
      <Panicle x={104} droop={-14} tip={28} grainFill={C.cream} />
      <Bug x={86} y={52} s={1.3} r={-65} color='#7d8a3a' />
    </g>
  ),
  'rice-armyworm': () => (
    <g>
      <path d='M60 120 L60 62' stroke={C.leafDark} strokeWidth='2.4' strokeLinecap='round' />
      <path d='M60 62 l-5 -3 l4 -2Z' fill={C.leafDark} />
      <g transform='translate(66 70) rotate(115)'>
        {Array.from({ length: 9 }, (_, i) => (
          <ellipse key={i} cx={i % 2 ? 3 : -3} cy={i * 5} rx='2.4' ry='4' fill={C.straw} />
        ))}
      </g>
      <path d='M104 120 C100 90 112 56 132 30 C128 52 120 88 112 120Z' fill={C.leaf} />
      <path d='M120 62 l-6 4 l4 4 l-5 4' fill='none' stroke={C.bg} strokeWidth='4' strokeLinejoin='round' />
      <Larva x={96} y={100} s={1} r={-60} color='#a3a85a' />
    </g>
  ),
  'corn-earworm': () => (
    <g>
      <path d='M80 118 C50 100 44 60 64 32 C70 60 76 90 84 112Z' fill={C.leaf} />
      <path d='M80 118 C110 100 116 60 96 32 C90 60 84 90 78 112Z' fill='#6fa55a' />
      <path d='M64 32 C72 18 88 18 96 32 C88 40 72 40 64 32Z' fill={C.straw} />
      {[[70, 30], [78, 27], [86, 27], [92, 31], [74, 35], [84, 34]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r='2.4' fill={i % 3 === 0 ? C.brown : '#f2d25a'} />
      ))}
      <path d='M82 22 C84 12 90 8 98 6' fill='none' stroke='#9a6a3a' strokeWidth='2' strokeLinecap='round' />
      <Larva x={86} y={38} s={1.1} r={25} color='#d7c76a' />
    </g>
  ),
  'corn-aphid': () => (
    <g>
      <path d='M80 120 L80 20' stroke={C.leafDark} strokeWidth='3' strokeLinecap='round' />
      {[40, 54, 68].flatMap((y) =>
        [-1, 1].map((d) => (
          <path key={`${y}${d}`} d={`M80 ${y} C${80 + d * 18} ${y - 10} ${80 + d * 34} ${y - 12} ${80 + d * 44} ${y - 4}`} fill='none' stroke={C.leaf} strokeWidth='2.2' strokeLinecap='round' />
        )),
      )}
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={80 + ((i * 17) % 38) - 19} cy={26 + ((i * 11) % 44)} r='2' fill='#8fcf5a' stroke={C.leafDark} strokeWidth='.5' />
      ))}
      <g transform='translate(116 92) rotate(-30)' fill={C.ink}>
        <circle r='3.2' />
        <circle cx='-6' r='2.6' />
        <ellipse cx='-13' rx='4.6' ry='3.4' />
        <path d='M-6 0 L-10 -7M-6 0 L-10 7M0 0 L-2 -8M0 0 L-2 8' stroke={C.ink} strokeWidth='1' fill='none' />
      </g>
    </g>
  ),
  'asiatic-corn-borer': () => (
    <g>
      <path d='M60 120 L60 70 L52 58 L66 24' fill='none' stroke={C.leaf} strokeWidth='12' strokeLinecap='round' strokeLinejoin='round' />
      <path d='M60 70 L52 58' fill='none' stroke={C.brown} strokeWidth='12' strokeLinecap='butt' opacity='.55' />
      {[100, 84].map((y) => (
        <path key={y} d={`M52 ${y} H68`} stroke={C.leafDark} strokeWidth='1.6' />
      ))}
      <ellipse cx='62' cy='64' rx='5' ry='3.4' fill='#2b1d12' />
      {[[72, 68], [76, 62], [70, 76], [78, 72]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r='2' fill={C.frass} />
      ))}
      <path d='M100 120 C98 90 104 60 122 34 C120 62 116 92 112 120Z' fill='#6fa55a' />
    </g>
  ),
  'common-cutworm': () => (
    <g>
      <Soil />
      {[26, 134].map((x) => (
        <g key={x}>
          <path d={`M${x} 92 L${x} 62`} stroke={C.leaf} strokeWidth='3.4' strokeLinecap='round' />
          <path d={`M${x} 70 C${x + 12} 62 ${x + 16} 56 ${x + 18} 50 M${x} 66 C${x - 12} 58 ${x - 16} 52 ${x - 18} 46`} fill='none' stroke={C.leaf} strokeWidth='3' strokeLinecap='round' />
        </g>
      ))}
      <path d='M80 92 L80 84' stroke={C.leaf} strokeWidth='3.4' strokeLinecap='round' />
      <g transform='translate(98 90) rotate(-8)'>
        <path d='M0 0 C12 -4 24 0 34 -2' stroke={C.leaf} strokeWidth='3.4' strokeLinecap='round' fill='none' />
        <path d='M18 -2 C26 -10 34 -10 38 -6' stroke={C.leaf} strokeWidth='3' strokeLinecap='round' fill='none' />
      </g>
      <g transform='translate(58 86)' fill='none' strokeLinecap='round'>
        <path d='M0 0 C-6 -10 8 -16 14 -8 C18 -2 12 6 4 4' stroke='#c3cf8a' strokeWidth='7' />
        <circle cx='4' cy='4' r='3.6' fill='#7a4a24' stroke='none' />
      </g>
    </g>
  ),
};

function Fallback() {
  return (
    <>
      <path d='M80 116 C58 80 34 56 12 40 C48 44 74 66 86 100Z' fill={C.leaf} />
      <path d='M80 116 C104 78 128 54 150 38 C114 44 88 66 78 100Z' fill='#6fa55a' />
    </>
  );
}

/** The picture area of a symptom card. Fills its parent; the parent sets the 4:3 shape. */
export function SymptomArt({ id }: { id: string }) {
  const photo = PHOTO_BY_ID.get(id);
  if (photo) {
    return <img src={photo} alt='' loading='lazy' decoding='async' className='size-full object-cover' />;
  }
  const Scene = SCENES[id] ?? Fallback;
  return (
    <svg viewBox='0 0 160 120' preserveAspectRatio='xMidYMid slice' className='size-full' aria-hidden='true' focusable='false'>
      <rect width='160' height='120' fill={C.bg} />
      <Scene />
    </svg>
  );
}
