import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '@/components/ai/ChatWidget';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-sidebar lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: isDesktop ? (sidebarCollapsed ? 72 : 280) : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'flex min-h-screen flex-1 flex-col',
          'w-full max-w-full overflow-hidden'
        )}
      >
        <Navbar
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          showMenuButton
        />
        {/* Mobile-first responsive padding: mobile 3, tablet 4, desktop 6 */}
        <div className="flex-1 w-full max-w-full overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6">
          {/* `key={pathname}` force le remontage de ce wrapper à chaque
           * navigation : DashboardLayout est persistant (ne remonte jamais
           * entre deux pages), donc sans cette clé, l'animation d'entrée
           * initial→animate ne se rejoue qu'une seule fois au tout premier
           * chargement — une navigation SPA ultérieure peut laisser ce
           * wrapper bloqué à son état initial (opacity: 0), rendant tout le
           * contenu invisible bien qu'il soit présent dans le DOM. */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.main>

      <ChatWidget />
    </div>
  );
}
