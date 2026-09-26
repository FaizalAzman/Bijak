/**
 * Motion policy — calm by default.
 *
 * Animate only to (a) confirm something the child just did — a press, a right/wrong
 * answer, a drag, progress filling — or (b) mark a rare milestone (level up, perfect
 * score, new best). No looping decoration, no staggered entrances, no bouncy springs.
 * Reanimated already skips animations when the device's "Reduce motion" setting is on.
 */
import { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

export const DURATION = { fast: 120, base: 200 } as const;

export const EASE_OUT = Easing.out(Easing.quad);

/** Quick cross-fade when one piece of content replaces another (next question, next lesson card). */
export const swapIn = FadeIn.duration(DURATION.base);
export const swapOut = FadeOut.duration(DURATION.fast);
