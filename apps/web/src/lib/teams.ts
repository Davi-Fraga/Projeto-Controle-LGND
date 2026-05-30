const TEAM_PREFIX_RE = /^TOP\s+#\d+\s*\|\s*/i;

export function formatTeamName(name: string): string {
  return name.replace(TEAM_PREFIX_RE, '');
}
