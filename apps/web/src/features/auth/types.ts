export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
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
