import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import '../styles/navbar.css';
import { LangSwitcher } from './LangSwitcher';
import { useTranslation } from 'react-i18next';

export interface NavbarProps {
  onLogout: () => void;
}

const NAV_ITEMS = [
  { path: '/dashboard', keyki: 'nav_main', icon: '🏠' },
  { path: '/tasks',     keyki: 'nav_tasks',     icon: '📋' },
  { path: '/focus',     keyki: 'nav_focus',     icon: '⏱' },
  { path: '/stats',     keyki: 'nav_stats',     icon: '📊' },
  { path: '/profile',   keyki: 'nav_profile',   icon: '👤' },
  { path: '/analysis',  keyki: 'nav_analysis',  icon: '🧠' },
  { path: '/settings',  keyki: 'nav_settings',  icon: '⚙️' },
] as const;

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const { t } = useTranslation();

  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), []);
  const closeMenu  = useCallback(() => setIsOpen(false), []);

  useEffect(() => { closeMenu(); }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        drawerRef.current?.contains(target) ||
        burgerRef.current?.contains(target)
      ) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.left     = '0';
    document.body.style.right    = '0';
    document.body.style.width    = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.left     = '';
      document.body.style.right    = '';
      document.body.style.width    = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Apply inert imperatively (DOM attribute, not React prop)
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    if (isOpen) {
      el.removeAttribute('inert');
    } else {
      el.setAttribute('inert', '');
    }
  }, [isOpen]);

  const handleLogout = useCallback(() => {
    closeMenu();
    onLogout();
  }, [closeMenu, onLogout]);

  return (
    <header className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo" aria-label="На главную">
          <span className="navbar-logo__dot" aria-hidden="true" />
          FocusNow
        </Link>

        {/* Desktop nav */}
        <nav
          className="navbar-nav"
          id="main-navigation"
          aria-label={t('nav_main')}
        >
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="nav-link__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-link__label">{t(item.keyki)}</span>
            </NavLink>
          ))}
        </nav>
         
         <LangSwitcher/>
        {/* Desktop logout */}
        <button
          onClick={handleLogout}
          className="btn btn--ghost btn--sm navbar-logout"
          aria-label="Выйти из аккаунта"
        >
          {t('logout')}
        </button>

      

        {/* Burger */}
        <button
          ref={burgerRef}
          className={`mobile-menu-btn${isOpen ? ' is-active' : ''}`}
          onClick={toggleMenu}
          aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          <span className="burger-line" />
          <span className="burger-line" />
          <span className="burger-line" />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        id="mobile-navigation"
        className={`mobile-drawer${isOpen ? ' is-open' : ''}`}
      >
        <nav className="mobile-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `mobile-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="mobile-nav-link__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{t(item.keyki)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mobile-drawer__footer">
          <button
            onClick={handleLogout}
            className="btn btn--ghost btn--block"
          >
            🚪 Выйти
          </button>
        </div>
      </div>
      
      {/* Overlay */}
      {isOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

export default Navbar;