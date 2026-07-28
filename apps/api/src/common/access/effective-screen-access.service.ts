import { Injectable } from '@nestjs/common';
import {
  EffectiveScreenAccessState,
  ScreenAccessLevel,
  type EffectiveScreenAccess,
  type UserScopeType,
} from '@central-da-manada/shared';
import { AccessPolicyService, type AccessScope } from './access-policy.service';
import { SCREEN_CATALOG, satisfyingScopeTypes } from './screen-catalog';

export type ScreenAccessSubject = {
  id: string;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class EffectiveScreenAccessService {
  constructor(private readonly accessPolicy: AccessPolicyService) {}

  async forUser(subject: ScreenAccessSubject): Promise<EffectiveScreenAccess[]> {
    const scope = await this.accessPolicy.resolveScopeByUserId(subject.id);
    return this.fromPermissionsAndScope(subject.permissions, scope);
  }

  fromPermissionsAndScope(permissions: Iterable<string>, scope: AccessScope): EffectiveScreenAccess[] {
    const effective = new Set(permissions);
    return SCREEN_CATALOG.map((screen) => {
      const hasView = screen.view.every((key) => effective.has(key));
      const hasEdit = screen.edit.length > 0 && screen.edit.every((key) => effective.has(key));
      const level = !hasView ? ScreenAccessLevel.NONE : hasEdit ? ScreenAccessLevel.EDIT : ScreenAccessLevel.VIEW;
      const hasScope = satisfyingScopeTypes(screen).some((type) => this.hasEffectiveScope(type, scope));
      const state = !hasView
        ? EffectiveScreenAccessState.MISSING_PERMISSION
        : screen.scopeTypes.length > 0 && !hasScope
          ? EffectiveScreenAccessState.MISSING_SCOPE
          : EffectiveScreenAccessState.AVAILABLE;
      return { screenId: screen.id, level, state, usable: state === EffectiveScreenAccessState.AVAILABLE };
    });
  }

  hasEffectiveScope(type: UserScopeType, scope: AccessScope): boolean {
    if (scope.isAdmin) return true;
    switch (type) {
      case 'CITY': return !!scope.allCities || scope.cityKeys.length > 0;
      case 'TEAM': return !!scope.allTeams || scope.teamIds.length > 0;
      case 'CHURCH': return !!scope.allChurches || scope.churchIds.length > 0;
      case 'TOP': return !!scope.allTops || scope.topIds.length > 0;
    }
    return false;
  }
}
