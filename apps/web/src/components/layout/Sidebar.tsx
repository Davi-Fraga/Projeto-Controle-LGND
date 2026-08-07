'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  MapPin,
  Map,
  HeartHandshake,
  MessageSquare,
  FileText,
  Building2,
  Church,
  UserCog,
  Network,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { groupedPrimaryNav } from '@central-da-manada/shared';
import { getCurrentUser } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';

// O manifesto compartilhado permanece a fonte de navegação; este mapa contém apenas ícones de UI.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  legendarios: Users,
  teams: Shield,
  'spiritual-leaders': Building2,
  map: Map,
  tops: MapPin,
  'org-chart': Network,
  'social-actions': HeartHandshake,
  communications: MessageSquare,
  reports: FileText,
  churches: Church,
  users: UserCog,
};

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // Escape fecha o drawer. Ouvido no documento porque o foco pode estar em qualquer item da
  // navegação — ou fora dela, se o menu foi aberto por toque.
  useEffect(() => {
    if (!isOpen) return undefined;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [isOpen]);

  // Fonte única de navegação: manifesto compartilhado por permissions efetivas
  // (change alinhar-abas). Sem gates paralelos por papel nas telas concedíveis; Usuários
  // continua exceção admin (declarada no manifesto). A autorização real é sempre no backend.
  const sections = groupedPrimaryNav(user);

  return (
    <>
      <div className="flex min-h-16 items-center justify-between border-b border-line bg-surface-subtle px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          <span className="text-sm font-bold uppercase tracking-wider text-content-strong">
            Manada <span className="text-accent">Cerrado</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-controls="primary-navigation"
          aria-expanded={isOpen}
          className="relative z-50 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-content-muted transition-colors hover:border-line hover:bg-surface-raised hover:text-content-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle"
        >
          {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      <aside
        id="primary-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface-subtle transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-lg shadow-black/30">
            <span className="text-sm font-black text-white">M</span>
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wide text-content-strong">Central da Manada</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Rota do Cerrado</p>
          </div>
        </div>

        {/* Seções são só apresentação: quem decide o que aparece é o manifesto, item a item.
            Grupo sem item visível não vira cabeçalho órfão (garantido em groupedPrimaryNav). */}
        <nav aria-label="Navegação principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.id ?? 'principal'} role="group" aria-label={section.label ?? undefined} className="space-y-1">
              {section.label ? (
                <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-content-disabled">
                  {section.label}
                </p>
              ) : null}

              {section.items.map((item) => {
                const Icon = ICONS[item.screenId];
                const isActive =
                  item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.screenId}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-4 py-2.5 text-sm font-medium tracking-wide transition-[color,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${
                      isActive
                        ? 'border-accent bg-accent/10 pl-3.5 text-accent'
                        : 'border-transparent text-content-muted hover:bg-surface-raised hover:text-content-strong'
                    }`}
                  >
                    {Icon ? (
                      <Icon
                        className={`h-5 w-5 ${isActive ? 'text-accent' : 'text-content-muted group-hover:text-content-strong'}`}
                        aria-hidden="true"
                      />
                    ) : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line bg-surface-subtle p-4">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Código de Honra</p>
            <p className="mt-1 text-xs italic leading-relaxed text-content-muted">
              “Um homem de verdade se levanta, protege sua família e lidera com coragem.”
            </p>
          </div>
        </div>
      </aside>

      {/* Véu, não um segundo controle: como botão nomeado ele duplicava o nome acessível do
          toggle na lista de botões de um leitor de tela. Fica `aria-hidden` e segue clicável
          no mouse e no toque; para o teclado sobram o toggle e o Escape. */}
      {isOpen ? (
        <button
          type="button"
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-black/70 backdrop-blur-sm md:hidden"
        />
      ) : null}
    </>
  );
}
