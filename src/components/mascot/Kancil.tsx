/**
 * Sang Kancil — Bijak's mascot. The clever mousedeer of Malay folklore, drawn in the
 * app's chunky ink-outline style, with moods that react to the child's learning.
 */
import { memo, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';

export type KancilMood = 'idle' | 'happy' | 'cheer' | 'sad' | 'think' | 'sleepy' | 'wow' | 'wave';

const FUR = '#D8893F';
const FUR_DARK = '#B86A2B';
const CREAM = '#FFE9C9';
const EAR_IN = '#F6B39A';
const BLUSH = '#FF9E80';
const INK = colors.ink;
const SW = 4;

function Eyes({ mood, blink }: { mood: KancilMood; blink: boolean }) {
  const closed = blink && (mood === 'idle' || mood === 'think' || mood === 'wave');
  if (mood === 'happy' || mood === 'cheer') {
    return (
      <G>
        <Path d="M63 97 Q78 79 93 97" stroke={INK} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        <Path d="M107 97 Q122 79 137 97" stroke={INK} strokeWidth={5.5} strokeLinecap="round" fill="none" />
      </G>
    );
  }
  if (mood === 'sleepy' || closed) {
    return (
      <G>
        <Path d="M65 94 Q78 102 91 94" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d="M109 94 Q122 102 135 94" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
      </G>
    );
  }
  const big = mood === 'wow';
  const look = mood === 'think' ? { x: 3, y: -4 } : mood === 'sad' ? { x: 0, y: 4 } : { x: 1.5, y: 1 };
  const pr = big ? 6.5 : 8.5;
  return (
    <G>
      {[78, 122].map((cx) => (
        <G key={cx}>
          <Ellipse cx={cx} cy={92} rx={big ? 17 : 15} ry={big ? 19 : 17} fill="#fff" stroke={INK} strokeWidth={3.5} />
          <Circle cx={cx + look.x} cy={93 + look.y} r={pr} fill={INK} />
          <Circle cx={cx + look.x + 3} cy={89 + look.y} r={3} fill="#fff" />
        </G>
      ))}
      {mood === 'sad' && (
        <G>
          <Path d="M62 80 L90 72" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
          <Path d="M138 80 L110 72" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        </G>
      )}
      {mood === 'think' && <Path d="M108 70 Q122 62 136 70" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />}
    </G>
  );
}

function Mouth({ mood }: { mood: KancilMood }) {
  switch (mood) {
    case 'happy':
    case 'cheer':
    case 'wave':
      return (
        <G>
          <Path d="M85 124 Q100 150 115 124 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M92 136 Q100 144 108 136 Q100 131 92 136 Z" fill="#FF7A8A" />
        </G>
      );
    case 'sad':
      return <Path d="M88 136 Q100 125 112 136" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    case 'wow':
      return <Ellipse cx={100} cy={133} rx={6.5} ry={8.5} fill={INK} />;
    case 'think':
      return <Path d="M91 131 Q101 127 111 129" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
    case 'sleepy':
      return <Ellipse cx={100} cy={131} rx={5} ry={4} fill={INK} />;
    default:
      return <Path d="M87 126 Q100 139 113 126" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
  }
}

function Arm({ side, angle }: { side: 'l' | 'r'; angle: number }) {
  const sx = side === 'l' ? 70 : 130;
  const sy = 168;
  return (
    <G transform={`rotate(${angle} ${sx} ${sy})`}>
      <Ellipse cx={sx} cy={sy + 20} rx={10} ry={23} fill={FUR} stroke={INK} strokeWidth={SW} />
      <Ellipse cx={sx} cy={sy + 38} rx={7} ry={5} fill={FUR_DARK} />
    </G>
  );
}

const KancilSvg = memo(function KancilSvg({ mood, blink, size }: { mood: KancilMood; blink: boolean; size: number }) {
  const arms = mood === 'cheer' ? [150, -150] : mood === 'wave' ? [18, -145] : mood === 'think' ? [18, -118] : mood === 'sad' ? [8, -8] : [22, -22];
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      {/* ears */}
      <G transform="rotate(-28 58 50)">
        <Ellipse cx={58} cy={50} rx={15} ry={33} fill={FUR_DARK} stroke={INK} strokeWidth={SW} />
        <Ellipse cx={58} cy={54} rx={7} ry={21} fill={EAR_IN} />
      </G>
      <G transform="rotate(28 142 50)">
        <Ellipse cx={142} cy={50} rx={15} ry={33} fill={FUR_DARK} stroke={INK} strokeWidth={SW} />
        <Ellipse cx={142} cy={54} rx={7} ry={21} fill={EAR_IN} />
      </G>
      {/* body */}
      <Arm side="l" angle={arms[0]} />
      <Arm side="r" angle={arms[1]} />
      <Path d="M62 218 C58 182 70 152 100 152 C130 152 142 182 138 218 Z" fill={FUR} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M84 160 C90 178 95 194 100 210 C105 194 110 178 116 160 Z" fill={CREAM} />
      <Path d="M76 170 L88 196" stroke={CREAM} strokeWidth={5} strokeLinecap="round" />
      <Path d="M124 170 L112 196" stroke={CREAM} strokeWidth={5} strokeLinecap="round" />
      {/* lime scarf */}
      <Path d="M64 150 Q100 172 136 150 L138 164 Q100 188 62 164 Z" fill={colors.lime} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M118 168 L130 196 L144 184 L132 164 Z" fill={colors.lime} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {/* head */}
      <Path d="M100 36 C146 36 166 66 164 98 C162 132 136 154 100 154 C64 154 38 132 36 98 C34 66 54 36 100 36 Z" fill={FUR} stroke={INK} strokeWidth={SW} />
      <Path d="M91 39 Q96 22 106 26 Q101 30 104 38" fill={FUR} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      <Ellipse cx={100} cy={124} rx={31} ry={23} fill={CREAM} />
      <Circle cx={63} cy={117} r={9} fill={BLUSH} opacity={0.6} />
      <Circle cx={137} cy={117} r={9} fill={BLUSH} opacity={0.6} />
      <Eyes mood={mood} blink={blink} />
      <Ellipse cx={100} cy={112} rx={9} ry={6} fill={INK} />
      <Ellipse cx={97} cy={110} rx={3} ry={1.6} fill="#fff" opacity={0.8} />
      <Mouth mood={mood} />
      {/* extras */}
      {mood === 'sleepy' && (
        <G>
          <SvgText x={150} y={40} fontSize={26} fontWeight="bold" fill={colors.grape}>
            Z
          </SvgText>
          <SvgText x={170} y={20} fontSize={18} fontWeight="bold" fill={colors.grape}>
            z
          </SvgText>
        </G>
      )}
      {mood === 'think' && (
        <SvgText x={158} y={48} fontSize={34} fontWeight="bold" fill={colors.grape} stroke={INK} strokeWidth={1.5}>
          ?
        </SvgText>
      )}
      {mood === 'cheer' && (
        <G>
          <Path d="M20 30 L24 42 L36 46 L24 50 L20 62 L16 50 L4 46 L16 42 Z" fill={colors.sun} stroke={INK} strokeWidth={2.5} />
          <Path d="M178 22 L181 31 L190 34 L181 37 L178 46 L175 37 L166 34 L175 31 Z" fill={colors.sun} stroke={INK} strokeWidth={2.5} />
        </G>
      )}
      {mood === 'sad' && <Path d="M146 96 Q150 106 146 112 Q142 106 146 96 Z" fill={colors.sky} stroke={INK} strokeWidth={2} />}
    </Svg>
  );
});

export function Kancil({ mood = 'idle', size = 120, animate = true }: { mood?: KancilMood; size?: number; animate?: boolean }) {
  const [blink, setBlink] = useState(false);
  const bob = useSharedValue(0);
  const pop = useSharedValue(1);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          if (!alive) return;
          setBlink(true);
          setTimeout(() => alive && setBlink(false), 130);
          loop();
        },
        2600 + Math.random() * 2200,
      );
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [animate]);

  useEffect(() => {
    if (!animate) return;
    pop.value = withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 260 }));
    if (mood === 'cheer') {
      bob.value = withRepeat(
        withSequence(withTiming(-14, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })),
        -1,
      );
      tilt.value = 0;
    } else if (mood === 'sad') {
      bob.value = withTiming(4, { duration: 300 });
      tilt.value = withSequence(
        withTiming(-6, { duration: 90 }),
        withRepeat(withSequence(withTiming(6, { duration: 90 }), withTiming(-6, { duration: 90 })), 3),
        withTiming(0, { duration: 90 }),
      );
    } else if (mood === 'wave') {
      tilt.value = withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(4, { duration: 300 })), -1, true);
      bob.value = withRepeat(withSequence(withTiming(-4, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
    } else {
      tilt.value = withTiming(mood === 'think' ? 5 : 0, { duration: 250 });
      bob.value = withDelay(
        100,
        withRepeat(withSequence(withTiming(-5, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1),
      );
    }
  }, [mood, animate, bob, pop, tilt]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${tilt.value}deg` }, { scale: pop.value }],
  }));

  return (
    <View style={{ width: size, height: size * 1.1 }} accessibilityLabel="Sang Kancil">
      <Animated.View style={style}>
        <KancilSvg mood={mood} blink={blink} size={size} />
      </Animated.View>
    </View>
  );
}
