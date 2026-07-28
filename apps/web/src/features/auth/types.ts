import type { EffectiveScreenAccess } from '@central-da-manada/shared';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  screenAccess?: EffectiveScreenAccess[];
};

export type AuthResponse = {
  data: {
    accessToken: string;
    user: CurrentUser;
  };
};

export type MeResponse = {
  data: CurrentUser;
};
