'use client';

import { Network } from 'lucide-react';
import { OrganogramaSection } from '@/features/org-chart/organograma-section';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { hasPermission } from '@/lib/permissions';
import { useCanOpenRoute } from '@/hooks/use-can';

export default function OrganogramaPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const canOpen = useCanOpenRoute(user);

  if (authLoading) return <main className="p-6 text-sm text-zinc-600">Carregando...</main>;

  // Editar pessoa no organograma: permissão nova (organogram.person.edit) OU a
  // funcional legada (legendarios.update) durante o rollout. Só habilita a ação;
  // o backend revalida em toda gravação.
  const canEditPerson = hasPermission(user, 'organogram.person.edit', 'legendarios.update');
  // Mover pessoa entre gestores na subdivisão (Fase 3): permissão estrutural.
  const canReorder = hasPermission(user, 'organogram.group.reorder');
  // Mudança estrutural crítica — mover uma liderança (Fase 4).
  const canStructureChange = hasPermission(user, 'organogram.structure.change');
  // Links CRUZADOS do painel da pessoa ("Ver ficha completa" / "Editar dados") levam para a aba
  // Legendários. `organogram.person.edit` autoriza a EDIÇÃO pela API, não a abertura daquela
  // tela — sem esta checagem o painel oferece uma rota barrada.
  const canOpenLegendaryScreen = canOpen('/dashboard/legendarios');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Organograma</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Hierarquia da manada em árvore. Escolha o escopo (Equipes, Coordenadores, Cidades ou TOPs). A visão abre resumida (raiz + 1º nível): clique num ramo para expandir sob demanda, use zoom e arraste para navegar.
        </p>
      </div>

      <OrganogramaSection canEditPerson={canEditPerson} canReorder={canReorder} canStructureChange={canStructureChange} canOpenLegendaryScreen={canOpenLegendaryScreen} />
    </div>
  );
}
