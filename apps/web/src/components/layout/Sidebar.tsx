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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/features/auth/actions';
import type { CurrentUser } from '@/features/auth/types';
import type { LucideIcon } from 'lucide-react';
import { visiblePrimaryNav } from '@central-da-manada/shared';

// Ícone por screenId — o manifesto compartilhado não carrega componentes React (nav é só UX).
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

  // Fonte única de navegação: manifesto compartilhado por permissions efetivas
  // (change alinhar-abas). Sem gates paralelos por papel nas telas concedíveis; Usuários
  // continua exceção admin (declarada no manifesto). A autorização real é sempre no backend.
  const visibleItems = visiblePrimaryNav(user);

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></span>
          <span className="font-bold tracking-wider text-zinc-100 uppercase text-sm">
            Manada <span className="text-orange-500">Cerrado</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-controls="primary-navigation"
          aria-expanded={isOpen}
          className="relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        id="primary-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-[#0B0B0B] transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand/Header */}
        <div className="flex h-16 items-center border-b border-zinc-800 px-6 gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-900/30">
            <span className="font-black text-white text-sm">M</span>
          </div>
          <div>
            <h1 className="font-black tracking-wide text-zinc-100 text-sm uppercase">
              Central da Manada
            </h1>
            <p className="text-[10px] font-semibold text-orange-500 tracking-widest uppercase">
              Rota do Cerrado
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = ICONS[item.screenId];
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.screenId}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500 border-l-2 border-orange-500 pl-3.5 shadow-inner'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 border-l-2 border-transparent'
                }`}
              >
                {Icon && <Icon className={`h-5 w-5 ${isActive ? 'text-orange-500' : 'text-zinc-400 group-hover:text-zinc-100'}`} />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 bg-[#080808]">
          <div className="rounded-lg bg-zinc-900/40 p-3 border border-zinc-800/40">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Código de Honra
            </p>
            <p className="mt-1 text-[11px] italic text-zinc-400 leading-relaxed">
              "Um homem de verdade se levanta, protege sua família e lidera com coragem."
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}
