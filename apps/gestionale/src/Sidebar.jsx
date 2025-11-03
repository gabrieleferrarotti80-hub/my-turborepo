// apps/gestionale/src/Sidebar.jsx

import React from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseData, getPermissionsByRole } from 'shared-core';
import { AziendaSelector } from './AziendaSelector.jsx';
import { NotificationBell } from 'shared-ui';
// ❗ Ho dovuto cambiare ArrowLeftIcon in PowerIcon per evitare conflitti
import { ShieldCheckIcon, PowerIcon } from '@heroicons/react/24/solid'; 
import {
    HomeIcon, CalendarDaysIcon, BriefcaseIcon, UsersIcon,
    ShoppingCartIcon, DocumentTextIcon, UserGroupIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

// ❗ 1. ACCETTA LA PROP 'cartellinoBadge'
export const Sidebar = ({ activeView, onNavigate, userRole, cartellinoBadge }) => {

    // Prendiamo i dati essenziali
    const { user, userAziendaId, companyFeatures, loadingAuth } = useFirebaseData(); 

    // --- LOGICA DI CARICAMENTO E RUOLI ---
    const effectiveUserRole = (userRole === 'proprietario' && userAziendaId)
        ? 'titolare-azienda'
        : userRole;

    const isSuperAdmin = userRole === 'proprietario' && !userAziendaId;

    const isBlocking = loadingAuth || !user || !userRole || (!isSuperAdmin && !companyFeatures);
    // --- FINE LOGICA ---

    console.log("%c[SIDEBAR DEBUG] 🔍 Analisi stato:", "color: orange; font-weight: bold;", {
        isBlocking, effectiveUserRole, userRole, isSuperAdmin, companyFeatures: !!companyFeatures
    });

    if (isBlocking) {
        return (
            <div className="h-full w-64 flex flex-col text-white bg-gray-800">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Gestionale</h2>
                    {user && <span className="text-sm text-gray-400">Ciao, {user.displayName || user.email}</span>}
                </div>
                <div className="flex-grow p-4">
                    <p className="text-gray-400">Caricamento menu...</p>
                </div>
            </div>
        );
    }

    const permissions = getPermissionsByRole(effectiveUserRole);

    // Gestione del Logout
    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
    };

    const menuItems = [
        { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, permissionKey: 'canViewDashboard' },
        { key: 'agenda', label: 'Agenda', icon: CalendarDaysIcon, feature: 'agenda', permissionKey: 'canViewAgenda' },
        { key: 'offerte', label: 'Offerte', icon: ClipboardDocumentListIcon, feature: 'offerte_management', permissionKey: 'canViewOfferte' },
        { key: 'documenti', label: 'Documenti', icon: DocumentTextIcon, feature: 'documenti', permissionKey: 'canViewDocumenti' },
        { key: 'personale', label: 'Personale', icon: UsersIcon, permissionKey: 'canViewPersonale' },
        { key: 'clienti', label: 'Clienti', icon: BriefcaseIcon, permissionKey: 'canViewClienti' },
        { key: 'magazzino', label: 'Magazzino', icon: ShoppingCartIcon, permissionKey: 'canViewMagazzino' },
        { key: 'gestione-operativa', label: 'Gestione Operativa', icon: UserGroupIcon, permissionKey: 'canViewGestioneOperativa' },
    ];

    const showAdminButton = isSuperAdmin;

    return (
        <div className="h-full w-64 flex flex-col text-white bg-gray-800">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Gestionale</h2>
                    <span className="text-sm text-gray-400">Ciao, {user.displayName || user.email}</span>
                </div>
                <NotificationBell />
            </div>
            
            {userRole === 'proprietario' && <AziendaSelector />}

            {/* ❗ 2. RENDERIZZA IL BADGE IN ALTO */}
            {cartellinoBadge && (
                <div className="p-4 border-b border-gray-700">
                    {cartellinoBadge}
                </div>
            )}

            <nav className="flex-grow p-4 overflow-y-auto">
                <ul className="space-y-1">
                    {menuItems
                        .filter(item => {
                            // ... (logica di filtering invariata) ...
                            if (isSuperAdmin) return true;
                            const features = companyFeatures || {};
                            const hasFeature = item.feature ? features[item.feature] === true : true;
                            const shouldShow = hasFeature; 
                            return shouldShow;
                        })
                        .map(item => { 
                            return ( 
                                <li key={item.key}>
                                    <button
                                        onClick={() => onNavigate(item.key)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 ${
                                            activeView === item.key ? 'bg-indigo-600' : 'hover:bg-gray-700'
                                        }`}
                                    >
                                        {/* <item.icon className="h-5 w-5" /> */}
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </li>
                            ); 
                        })} 
                    {showAdminButton && (
                        <li className="mt-4 pt-4 border-t border-gray-700">
                            <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Amministrazione</h3>
                            <button
                                onClick={() => onNavigate('admin-aziende')}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-3 ${
                                    activeView === 'admin-aziende' ? 'bg-indigo-600' : 'hover:bg-gray-700'
                                }`}
                            >
                                <ShieldCheckIcon className="h-5 w-5" />
                                <span className="font-medium">Gestione Aziende</span>
                            </button>
                        </li>
                    )}
                </ul>
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-3"
                >
                    <PowerIcon className="h-5 w-5" /> {/* ❗ Icona corretta */}
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};