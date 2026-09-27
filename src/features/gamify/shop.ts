/** Module 17 — Virtual currency storefront catalogue (cosmetics for Module 18's avatar). */
import type { UiLang } from '@/i18n/define';

export type Slot = 'hat' | 'glasses' | 'outfit' | 'bg' | 'pet';

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  /** Unlocks for purchase only from this level. */
  minLevel?: number;
  /** Primary colour used by the SVG renderer (outfits / backgrounds / hats). */
  color?: string;
  accent?: string;
  /** Emoji for pets and shop tiles. */
  emoji?: string;
}

export const SHOP: ShopItem[] = [
  // Outfits
  { id: 'tee-lime', slot: 'outfit', name: 'Lime Tee', price: 0, color: '#D8F34A', emoji: '👕' },
  { id: 'tee-sky', slot: 'outfit', name: 'Sky Tee', price: 40, color: '#5AB8F5', emoji: '👕' },
  { id: 'tee-berry', slot: 'outfit', name: 'Berry Tee', price: 40, color: '#F0507A', emoji: '👕' },
  { id: 'hoodie-grape', slot: 'outfit', name: 'Grape Hoodie', price: 90, color: '#8B5CF6', accent: '#EDE4FF', emoji: '🧥' },
  { id: 'jersey-stripe', slot: 'outfit', name: 'Striker Jersey', price: 120, color: '#FFC93C', accent: '#16140F', emoji: '⚽' },
  { id: 'suit-space', slot: 'outfit', name: 'Astronaut Suit', price: 250, minLevel: 5, color: '#FFFDF8', accent: '#F26B3A', emoji: '🧑‍🚀' },
  // Hats
  { id: 'cap-red', slot: 'hat', name: 'Red Cap', price: 50, color: '#F0507A', emoji: '🧢' },
  { id: 'songkok', slot: 'hat', name: 'Songkok', price: 80, color: '#16140F', emoji: '🎩' },
  { id: 'headphones', slot: 'hat', name: 'Headphones', price: 110, color: '#8B5CF6', emoji: '🎧' },
  { id: 'crown', slot: 'hat', name: 'Golden Crown', price: 300, minLevel: 8, color: '#FFC93C', emoji: '👑' },
  { id: 'wizard', slot: 'hat', name: 'Wizard Hat', price: 220, minLevel: 6, color: '#5AB8F5', emoji: '🧙' },
  // Glasses
  { id: 'round-specs', slot: 'glasses', name: 'Smart Specs', price: 45, color: '#16140F', emoji: '👓' },
  { id: 'sunnies', slot: 'glasses', name: 'Cool Shades', price: 75, color: '#16140F', emoji: '🕶️' },
  { id: 'star-specs', slot: 'glasses', name: 'Star Glasses', price: 140, color: '#F26B3A', emoji: '🤩' },
  // Backgrounds
  { id: 'bg-cream', slot: 'bg', name: 'Cream', price: 0, color: '#FFF2C9', emoji: '🟨' },
  { id: 'bg-mint', slot: 'bg', name: 'Mint Garden', price: 30, color: '#DDF9E6', accent: '#4ADE80', emoji: '🌿' },
  { id: 'bg-sunset', slot: 'bg', name: 'Sunset', price: 60, color: '#FFE3D6', accent: '#F26B3A', emoji: '🌅' },
  { id: 'bg-ocean', slot: 'bg', name: 'Ocean', price: 60, color: '#DDF0FD', accent: '#5AB8F5', emoji: '🌊' },
  { id: 'bg-space', slot: 'bg', name: 'Outer Space', price: 180, minLevel: 4, color: '#2B2350', accent: '#FFC93C', emoji: '🌌' },
  // Pets
  { id: 'pet-cat', slot: 'pet', name: 'Kucing', price: 150, emoji: '🐱' },
  { id: 'pet-chick', slot: 'pet', name: 'Chick', price: 100, emoji: '🐥' },
  { id: 'pet-turtle', slot: 'pet', name: 'Penyu', price: 160, emoji: '🐢' },
  { id: 'pet-dragon', slot: 'pet', name: 'Baby Dragon', price: 400, minLevel: 10, emoji: '🐲' },
];

export const itemById = (id: string | undefined) => SHOP.find((i) => i.id === id);

export const FREE_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);

/** Message keys for each slot's name ("Outfits" / "Pakaian"). */
export const SLOT_KEY = { outfit: 'slot.outfit', hat: 'slot.hat', glasses: 'slot.glasses', bg: 'slot.bg', pet: 'slot.pet' } as const satisfies Record<Slot, string>;

/** Bahasa Melayu names of the shop items. */
const NAME_MS: Record<string, string> = {
  'tee-lime': 'Baju-T Limau',
  'tee-sky': 'Baju-T Langit',
  'tee-berry': 'Baju-T Beri',
  'hoodie-grape': 'Hoodie Anggur',
  'jersey-stripe': 'Jersi Penyerang',
  'suit-space': 'Sut Angkasawan',
  'cap-red': 'Topi Merah',
  songkok: 'Songkok',
  headphones: 'Fon Kepala',
  crown: 'Mahkota Emas',
  wizard: 'Topi Ahli Sihir',
  'round-specs': 'Cermin Mata Pintar',
  sunnies: 'Cermin Mata Hitam',
  'star-specs': 'Cermin Mata Bintang',
  'bg-cream': 'Krim',
  'bg-mint': 'Taman Pudina',
  'bg-sunset': 'Senja',
  'bg-ocean': 'Lautan',
  'bg-space': 'Angkasa Lepas',
  'pet-cat': 'Kucing',
  'pet-chick': 'Anak Ayam',
  'pet-turtle': 'Penyu',
  'pet-dragon': 'Anak Naga',
};

export const itemName = (item: Pick<ShopItem, 'id' | 'name'>, lang: UiLang) => (lang === 'ms' ? (NAME_MS[item.id] ?? item.name) : item.name);

export interface AvatarConfig {
  skin: string;
  hair: 'short' | 'spiky' | 'curly' | 'long' | 'bun' | 'tudung';
  hairColor: string;
  eyes: 'round' | 'happy' | 'wink';
  outfit: string;
  bg: string;
  hat?: string;
  glasses?: string;
  pet?: string;
}

export const SKIN_TONES = ['#FFDCB5', '#F1C27D', '#D9A066', '#B97A4B', '#8D5524'];
export const HAIR_COLORS = ['#16140F', '#4A2E1C', '#8B5A2B', '#D9A04A', '#8B5CF6'];
export const HAIR_STYLES: AvatarConfig['hair'][] = ['short', 'spiky', 'curly', 'long', 'bun', 'tudung'];
export const EYES: AvatarConfig['eyes'][] = ['round', 'happy', 'wink'];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: SKIN_TONES[1],
  hair: 'short',
  hairColor: HAIR_COLORS[0],
  eyes: 'round',
  outfit: 'tee-lime',
  bg: 'bg-cream',
};
