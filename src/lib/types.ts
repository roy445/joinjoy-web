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
  emailVerified: boolean;
};