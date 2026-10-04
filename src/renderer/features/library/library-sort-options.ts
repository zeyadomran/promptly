import {
  CalendarArrowDown,
  CalendarArrowUp,
  History,
  type LucideIcon,
  TrendingUp
} from 'lucide-react';

import type { SearchRequest } from '../../../shared/contracts/domain';

export const librarySortOptions: {
  value: SearchRequest['sort'];
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'newest', label: 'Newest first', icon: CalendarArrowDown },
  { value: 'oldest', label: 'Oldest first', icon: CalendarArrowUp },
  { value: 'most-copied', label: 'Most copied', icon: TrendingUp },
  { value: 'recently-copied', label: 'Recently copied', icon: History }
];
