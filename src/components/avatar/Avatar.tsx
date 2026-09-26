/** Module 18 — SVG avatar. Layers: background → hair (back) → body/outfit → head → face → hair → glasses → hat → pet. */
import { memo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { itemById, type AvatarConfig } from '@/features/gamify/shop';
import { colors } from '@/theme';

export type AvatarMood = 'happy' | 'excited' | 'sleepy';

const INK = colors.ink;

function Background({ id }: { id: string }) {
  const item = itemById(id);
  const bg = item?.color ?? '#FFF2C9';
  const accent = item?.accent ?? colors.sun;
  return (
    <G>
      <Rect x={0} y={0} width={200} height={200} fill={bg} />
      {id === 'bg-sunset' && <Circle cx={150} cy={60} r={30} fill={accent} opacity={0.8} />}
      {id === 'bg-ocean' && (
        <G opacity={0.7}>
          <Path d="M0 60 Q25 48 50 60 T100 60 T150 60 T200 60" stroke={accent} strokeWidth={6} fill="none" />
          <Path d="M0 30 Q25 18 50 30 T100 30 T150 30 T200 30" stroke={accent} strokeWidth={6} fill="none" />
        </G>
      )}
      {id === 'bg-space' && (
        <G>
          {[
            [30, 30],
            [160, 40],
            [40, 120],
            [170, 110],
            [120, 20],
            [20, 80],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} fill={accent} />
          ))}
        </G>
      )}
      {id === 'bg-mint' && (
        <G opacity={0.85}>
          <Ellipse cx={30} cy={50} rx={10} ry={22} fill={accent} transform="rotate(-30 30 50)" />
          <Ellipse cx={172} cy={70} rx={10} ry={22} fill={accent} transform="rotate(30 172 70)" />
        </G>
      )}
      {id === 'bg-cream' && <Circle cx={100} cy={100} r={80} fill="#FFE8A3" opacity={0.6} />}
    </G>
  );
}

function Outfit({ id, skin }: { id: string; skin: string }) {
  const item = itemById(id);
  const c = item?.color ?? colors.lime;
  const a = item?.accent ?? INK;
  return (
    <G>
      <Rect x={88} y={124} width={24} height={20} fill={skin} stroke={INK} strokeWidth={4} />
      <Path d="M38 204 C38 156 66 138 100 138 C134 138 162 156 162 204 Z" fill={c} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      {id === 'jersey-stripe' && (
        <G>
          <Path d="M78 144 L74 204" stroke={a} strokeWidth={9} />
          <Path d="M122 144 L126 204" stroke={a} strokeWidth={9} />
          <Path d="M100 138 L100 204" stroke={a} strokeWidth={9} />
        </G>
      )}
      {id === 'hoodie-grape' && (
        <G>
          <Path d="M70 144 Q100 170 130 144" stroke={a} strokeWidth={6} fill="none" />
          <Path d="M92 156 L90 180 M108 156 L110 180" stroke={a} strokeWidth={4} strokeLinecap="round" />
        </G>
      )}
      {id === 'suit-space' && (
        <G>
          <Rect x={86} y={160} width={28} height={20} rx={4} fill={a} stroke={INK} strokeWidth={3} />
          <Circle cx={66} cy={170} r={6} fill={colors.sky} stroke={INK} strokeWidth={2.5} />
        </G>
      )}
      {id.startsWith('tee') && <Path d="M84 139 Q100 152 116 139" stroke={INK} strokeWidth={4} fill="none" />}
    </G>
  );
}

function HairBack({ cfg }: { cfg: AvatarConfig }) {
  if (cfg.hair === 'long')
    return (
      <G fill={cfg.hairColor} stroke={INK} strokeWidth={4} strokeLinejoin="round">
        <Path d="M56 84 Q46 140 60 158 L78 150 L72 96 Z" />
        <Path d="M144 84 Q154 140 140 158 L122 150 L128 96 Z" />
      </G>
    );
  if (cfg.hair === 'tudung')
    return <Path d="M48 98 C48 48 74 32 100 32 C126 32 152 48 152 98 L160 156 Q100 180 40 156 Z" fill={cfg.hairColor} stroke={INK} strokeWidth={4} strokeLinejoin="round" />;
  return null;
}

function HairFront({ cfg }: { cfg: AvatarConfig }) {
  const f = cfg.hairColor;
  switch (cfg.hair) {
    case 'short':
    case 'long':
      return <Path d="M55 90 C52 52 78 38 100 38 C124 38 150 52 145 90 C138 70 122 62 100 62 C80 62 64 70 55 90 Z" fill={f} stroke={INK} strokeWidth={4} strokeLinejoin="round" />;
    case 'spiky':
      return (
        <Path
          d="M55 88 L58 58 L72 64 L76 42 L90 56 L100 34 L110 56 L124 42 L128 64 L142 58 L145 88 C132 70 68 70 55 88 Z"
          fill={f}
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      );
    case 'curly':
      return (
        <G fill={f} stroke={INK} strokeWidth={4}>
          {[
            [62, 74],
            [72, 56],
            [90, 46],
            [110, 46],
            [128, 56],
            [138, 74],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={15} />
          ))}
        </G>
      );
    case 'bun':
      return (
        <G>
          <Circle cx={100} cy={38} r={15} fill={f} stroke={INK} strokeWidth={4} />
          <Path d="M55 90 C52 52 78 44 100 44 C124 44 150 52 145 90 C138 70 122 64 100 64 C80 64 64 70 55 90 Z" fill={f} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        </G>
      );
    case 'tudung':
      return <Path d="M62 76 Q100 50 138 76" stroke={INK} strokeWidth={3} fill="none" opacity={0.35} />;
  }
}

function Face({ cfg, mood }: { cfg: AvatarConfig; mood: AvatarMood }) {
  const eyes = mood === 'sleepy' ? 'sleepy' : cfg.eyes;
  return (
    <G>
      {cfg.hair === 'tudung' ? (
        <Ellipse cx={100} cy={98} rx={37} ry={41} fill={cfg.skin} stroke={INK} strokeWidth={4} />
      ) : (
        <G>
          <Circle cx={56} cy={98} r={10} fill={cfg.skin} stroke={INK} strokeWidth={4} />
          <Circle cx={144} cy={98} r={10} fill={cfg.skin} stroke={INK} strokeWidth={4} />
          <Circle cx={100} cy={92} r={46} fill={cfg.skin} stroke={INK} strokeWidth={4} />
        </G>
      )}
      <Circle cx={74} cy={110} r={7} fill="#FF9E80" opacity={0.55} />
      <Circle cx={126} cy={110} r={7} fill="#FF9E80" opacity={0.55} />
      {eyes === 'round' && (
        <G>
          <Circle cx={84} cy={96} r={6.5} fill={INK} />
          <Circle cx={116} cy={96} r={6.5} fill={INK} />
          <Circle cx={86} cy={94} r={2} fill="#fff" />
          <Circle cx={118} cy={94} r={2} fill="#fff" />
        </G>
      )}
      {eyes === 'happy' && (
        <G stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none">
          <Path d="M76 98 Q84 88 92 98" />
          <Path d="M108 98 Q116 88 124 98" />
        </G>
      )}
      {eyes === 'wink' && (
        <G>
          <Circle cx={84} cy={96} r={6.5} fill={INK} />
          <Circle cx={86} cy={94} r={2} fill="#fff" />
          <Path d="M108 97 Q116 90 124 97" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      )}
      {eyes === 'sleepy' && (
        <G stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none">
          <Path d="M77 96 Q84 101 91 96" />
          <Path d="M109 96 Q116 101 123 96" />
        </G>
      )}
      {mood === 'excited' ? (
        <Path d="M86 111 Q100 132 114 111 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      ) : mood === 'sleepy' ? (
        <Ellipse cx={100} cy={116} rx={5} ry={4} fill={INK} />
      ) : (
        <Path d="M87 112 Q100 124 113 112" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      )}
    </G>
  );
}

function Glasses({ id }: { id?: string }) {
  if (!id) return null;
  const c = itemById(id)?.color ?? INK;
  if (id === 'sunnies')
    return (
      <G>
        <Rect x={68} y={86} width={28} height={18} rx={7} fill={INK} />
        <Rect x={104} y={86} width={28} height={18} rx={7} fill={INK} />
        <Path d="M96 92 L104 92" stroke={INK} strokeWidth={4} />
        <Path d="M74 90 L80 90" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      </G>
    );
  if (id === 'star-specs') {
    const star = (cx: number) => `M${cx} 82 L${cx + 5} 92 L${cx + 15} 93 L${cx + 7} 100 L${cx + 10} 110 L${cx} 104 L${cx - 10} 110 L${cx - 7} 100 L${cx - 15} 93 L${cx - 5} 92 Z`;
    return (
      <G>
        <Path d={star(84)} fill={c} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Path d={star(116)} fill={c} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </G>
    );
  }
  return (
    <G stroke={c} strokeWidth={3.5} fill="rgba(255,255,255,0.25)">
      <Circle cx={84} cy={96} r={13} />
      <Circle cx={116} cy={96} r={13} />
      <Path d="M97 96 L103 96" />
    </G>
  );
}

function Hat({ id }: { id?: string }) {
  if (!id) return null;
  const c = itemById(id)?.color ?? colors.berry;
  switch (id) {
    case 'cap-red':
      return (
        <G stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <Path d="M54 72 C56 36 144 36 146 72 Z" fill={c} />
          <Path d="M100 70 L170 72 Q172 82 140 82 L100 78 Z" fill={c} />
          <Circle cx={100} cy={42} r={4} fill={INK} />
        </G>
      );
    case 'songkok':
      return (
        <G stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <Path d="M58 66 L64 30 L136 30 L142 66 Q100 58 58 66 Z" fill={c} />
          <Path d="M64 38 L136 38" stroke="#3A3A3A" strokeWidth={2} />
        </G>
      );
    case 'headphones':
      return (
        <G stroke={INK} strokeWidth={4}>
          <Path d="M50 96 C46 40 154 40 150 96" stroke={c} strokeWidth={9} fill="none" />
          <Rect x={40} y={84} width={20} height={32} rx={9} fill={c} />
          <Rect x={140} y={84} width={20} height={32} rx={9} fill={c} />
        </G>
      );
    case 'crown':
      return <Path d="M60 64 L60 30 L80 46 L100 22 L120 46 L140 30 L140 64 Q100 56 60 64 Z" fill={c} stroke={INK} strokeWidth={4} strokeLinejoin="round" />;
    case 'wizard':
      return (
        <G stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <Path d="M52 66 Q100 52 148 66 L104 2 Z" fill={c} />
          <Path d="M100 30 L103 37 L110 38 L105 43 L106 50 L100 46 L94 50 L95 43 L90 38 L97 37 Z" fill={colors.sun} strokeWidth={2} />
        </G>
      );
    default:
      return null;
  }
}

export const Avatar = memo(function Avatar({ config, size = 96, mood = 'happy', ring = true }: { config: AvatarConfig; size?: number; mood?: AvatarMood; ring?: boolean }) {
  const pet = itemById(config.pet);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 2.5 : 0, borderColor: INK, overflow: 'hidden' }}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Defs>
            <ClipPath id="clip">
              <Circle cx={100} cy={100} r={100} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#clip)">
            <Background id={config.bg} />
            <HairBack cfg={config} />
            <Outfit id={config.outfit} skin={config.skin} />
            <Face cfg={config} mood={mood} />
            <HairFront cfg={config} />
            <Glasses id={config.glasses} />
            <Hat id={config.hat} />
          </G>
        </Svg>
      </View>
      {pet?.emoji && (
        <View
          style={{
            position: 'absolute',
            right: -size * 0.04,
            bottom: -size * 0.02,
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size,
            backgroundColor: colors.paper,
            borderWidth: 2,
            borderColor: INK,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.2 }}>{pet.emoji}</Text>
        </View>
      )}
    </View>
  );
});
