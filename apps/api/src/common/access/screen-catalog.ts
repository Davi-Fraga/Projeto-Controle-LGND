import { UserScopeType } from '@central-da-manada/shared';

// Fonte da verdade: cada TELA/MÓDULO mapeia para seu conjunto de permissions,
// separando leitura (view) de mutação (edit) para suportar os níveis NONE/VIEW/EDIT.
// O administrador opera por TELA + nível; nunca vê/escolhe permissions cruas.
export type ScreenDef = {
  id: string;
  label: string;
  view: string[];
  edit: string[];
  // Tipos de escopo aplicáveis a esta tela (vazio = sem recorte de dados).
  scopeTypes: UserScopeType[];
};

export const SCREEN_CATALOG: ScreenDef[] = [
  {
    id: 'dashboard',
    label: 'Painel',
    view: ['dashboard.read'],
    edit: [],
    scopeTypes: [],
  },
  {
    id: 'legendarios',
    label: 'Legendários',
    view: ['legendarios.read', 'legendarios.history.read', 'professions.read', 'expertises.read'],
    edit: [
      'legendarios.create',
      'legendarios.update',
      'legendarios.delete',
      'legendarios.restore',
      'legendarios.history.create',
    ],
    scopeTypes: [UserScopeType.CITY, UserScopeType.TEAM, UserScopeType.CHURCH],
  },
  {
    id: 'teams',
    label: 'Equipes',
    view: ['teams.read', 'teams.members.read'],
    edit: [
      'teams.create',
      'teams.update',
      'teams.delete',
      'teams.restore',
      'teams.members.add',
      'teams.members.update',
      'teams.members.remove',
    ],
    scopeTypes: [UserScopeType.TEAM],
  },
  {
    id: 'churches',
    label: 'Igrejas',
    view: ['churches.read'],
    edit: ['churches.create', 'churches.update', 'churches.delete'],
    scopeTypes: [UserScopeType.CHURCH],
  },
  {
    id: 'tops',
    label: 'TOPs',
    view: [
      'tops.read',
      'tops.participants.read',
      'tops.servants.read',
      'tops.teams.read',
      'tops.families.read',
      'tops.families.members.read',
      'tops.preregistrations.read',
    ],
    edit: [
      'tops.create',
      'tops.update',
      'tops.delete',
      'tops.restore',
      'tops.participants.add',
      'tops.participants.update',
      'tops.participants.remove',
      'tops.servants.add',
      'tops.servants.update',
      'tops.servants.remove',
      'tops.teams.add',
      'tops.teams.update',
      'tops.teams.remove',
      'tops.families.create',
      'tops.families.update',
      'tops.families.delete',
      'tops.families.restore',
      'tops.families.members.add',
      'tops.families.members.update',
      'tops.families.members.remove',
      'tops.families.members.transfer',
      'tops.preregistrations.approve',
      'tops.preregistrations.reject',
      'tops.preregistrations.delete',
    ],
    scopeTypes: [UserScopeType.TOP],
  },
  {
    id: 'org-chart',
    label: 'Organograma',
    view: ['teams.read', 'legendarios.read', 'tops.read'],
    edit: [],
    scopeTypes: [UserScopeType.CITY, UserScopeType.TEAM],
  },
  {
    id: 'families',
    label: 'Famílias',
    view: ['families.read'],
    edit: ['families.create', 'families.update'],
    scopeTypes: [],
  },
  {
    id: 'social-actions',
    label: 'Ações Sociais',
    view: ['social-actions.read', 'social-actions.participants.read'],
    edit: [
      'social-actions.create',
      'social-actions.update',
      'social-actions.delete',
      'social-actions.restore',
      'social-actions.participants.add',
      'social-actions.participants.update',
      'social-actions.participants.remove',
    ],
    scopeTypes: [UserScopeType.CITY],
  },
  {
    id: 'communications',
    label: 'Comunicação',
    view: ['communications.read', 'communications.recipients.read'],
    edit: [
      'communications.create',
      'communications.update',
      'communications.send',
      'communications.delete',
      'communications.recipients.update',
    ],
    scopeTypes: [],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    view: ['reports.read'],
    edit: ['reports.export', 'reports.contacts.export'],
    scopeTypes: [UserScopeType.CITY],
  },
  {
    id: 'map',
    label: 'Mapa',
    view: ['map.read'],
    edit: [],
    scopeTypes: [UserScopeType.CITY],
  },
  {
    id: 'users',
    label: 'Usuários',
    view: ['users.read', 'audit.read'],
    edit: ['users.create', 'users.update', 'users.deactivate'],
    scopeTypes: [],
  },
];

export function getScreen(id: string): ScreenDef | undefined {
  return SCREEN_CATALOG.find((screen) => screen.id === id);
}

// Conjunto de permissions de uma tela para um nível: VIEW = view; EDIT = view ∪ edit.
export function permissionsForLevel(screen: ScreenDef, level: 'VIEW' | 'EDIT'): string[] {
  return level === 'EDIT' ? [...screen.view, ...screen.edit] : [...screen.view];
}
