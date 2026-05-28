'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  MapPin,
  HeartHandshake,
  MessageSquare,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const MENU_ITEMS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/legendarios', label: 'Legendários', icon: Users },
  { href: '/dashboard/equipes', label: 'Equipes', icon: Shield },
  { href: '/dashboard/tops', label: 'TOPs', icon: MapPin },
  { href: '/dashboard/acoes-sociais', label: 'Ações Sociais', icon: HeartHandshake },
  { href: '/dashboard/comunicacao', label: 'Comunicação', icon: MessageSquare },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
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
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500 border-l-2 border-orange-500 pl-3.5 shadow-inner'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 border-l-2 border-transparent'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-orange-500' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Spiritual Quote/Footer */}
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
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}
