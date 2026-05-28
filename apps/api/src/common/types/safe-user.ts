export type UserWithAccess = {
  id: string;
  name: string;
  email: string;
  legendaryId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{
        permission: {
          key: string;
        };
      }>;
    };
  }>;
};
