// Mixed avatar styles: photorealistic and abstract
// Photorealistic: Marcus, Diane, David, Evelyn, Reese, Carmen, Ray, Ted
// Abstract: Jordan, Soleil, Benny (use AbstractAvatar component)

import marcusImg from '@/assets/avatars/marcus.jpg';
import dianeImg from '@/assets/avatars/diane.jpg';
import davidImg from '@/assets/avatars/david.jpg';
import evelynImg from '@/assets/avatars/evelyn.jpg';
import reeseImg from '@/assets/avatars/reese.jpg';
import carmenImg from '@/assets/avatars/carmen.jpg';
import rayImg from '@/assets/avatars/ray.jpg';
import tedImg from '@/assets/avatars/ted.jpg';

export type AvatarStyle = 'photo' | 'anime' | 'abstract';

export const avatarImages: Record<string, string> = {
  marcus: marcusImg,
  diane: dianeImg,
  david: davidImg,
  evelyn: evelynImg,
  reese: reeseImg,
  carmen: carmenImg,
  ray: rayImg,
  ted: tedImg,
};

export const avatarStyles: Record<string, AvatarStyle> = {
  marcus: 'photo',
  diane: 'photo',
  david: 'photo',
  evelyn: 'photo',
  reese: 'photo',
  carmen: 'photo',
  ray: 'photo',
  ted: 'photo',
  jordan: 'abstract',
  soleil: 'abstract',
  benny: 'abstract',
};
