export type ClientUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  canCreateEvent: boolean;
  creditScore: string;
  isBlacklisted: boolean;
  jCoins: number;
  aiTitles: string[] | null;
  activeTitle: string | null;
  activeBadge: string | null;
  activeAvatarFrame: string | null;
};