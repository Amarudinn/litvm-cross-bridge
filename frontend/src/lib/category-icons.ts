import {
  TennisBall,
  Basketball,
  SoccerBall,
  Football,
  HandFist,
  Car,
  Motorcycle,
  CurrencyBtc,
  GameController,
  Tag,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

const iconMap: Record<string, Icon> = {
  'tennis-ball': TennisBall,
  'basketball': Basketball,
  'soccer-ball': SoccerBall,
  'football': Football,
  'hand-fist': HandFist,
  'car': Car,
  'motorcycle': Motorcycle,
  'currency-eth': CurrencyBtc,
  'game-controller': GameController,
  'tag': Tag,
};

export function getCategoryIcon(iconName: string): Icon {
  return iconMap[iconName] || Tag;
}

export const availableIcons = Object.keys(iconMap);

export default iconMap;
