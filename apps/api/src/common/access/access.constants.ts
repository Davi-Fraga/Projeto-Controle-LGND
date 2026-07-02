// Fonte única do papel de acesso total. Os demais papéis (`SystemRole`) são apenas
// a "Função na Manada" (rótulo organizacional) e NÃO concedem acesso — todo o acesso
// dos não-admin vem das concessões por tela (Controle de Acessos).
export const ADMIN_ROLE = 'COORDINATION_ADMIN';

export function hasAdminRole(roleNames: string[]): boolean {
  return roleNames.includes(ADMIN_ROLE);
}

// Base de permissions de um papel: só conta quando o papel é o Administrador.
// Para as demais funções, a base é vazia.
export function roleContributesBase(roleName: string): boolean {
  return roleName === ADMIN_ROLE;
}
