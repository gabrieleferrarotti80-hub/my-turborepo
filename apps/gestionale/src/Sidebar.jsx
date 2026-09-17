import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseData, getPermissionsByRole } from 'shared-core';
import { AziendaSelector } from './AziendaSelector.jsx';
import { NotificationBell } from 'shared-ui';
import { ShieldCheckIcon, PowerIcon } from '@heroicons/react/24/solid'; 
import {
    HomeIcon, CalendarDaysIcon, BriefcaseIcon, UsersIcon,
    ShoppingCartIcon, DocumentTextIcon, UserGroupIcon, ClipboardDocumentListIcon,
    ClockIcon, CurrencyDollarIcon, TruckIcon, ChartPieIcon,
    ArchiveBoxArrowDownIcon, ChevronDownIcon, Cog6ToothIcon, 
    ChevronRightIcon, WrenchScrewdriverIcon, BuildingStorefrontIcon,
    ListBulletIcon, MagnifyingGlassIcon, ClipboardDocumentCheckIcon,
    ShoppingBagIcon, KeyIcon, GlobeEuropeAfricaIcon, BeakerIcon // 🌟 AGGIUNTA ICONA BEAKER
} from '@heroicons/react/24/outline';

export const Sidebar = ({ activeView, onNavigate, userRole, cartellinoBadge }) => {

    const { user, userAziendaId, companyFeatures, loadingAuth, data } = useFirebaseData(); 

    const effectiveUserRole = (userRole === 'proprietario' && userAziendaId)
        ? 'titolare-azienda'
        : userRole;

    // 🌟 MODALITÀ GOD: Utente proprietario ma NON è entrato in una specifica azienda
    const isSuperAdmin = userRole === 'proprietario' && !userAziendaId;
    const permissions = getPermissionsByRole(effectiveUserRole);

    const reports = data?.reports || [];
    const cantieri = data?.cantieri || [];
    
    const cantieriVisibiliIds = cantieri.filter(c => c.visibilePortale === true).map(c => c.id);
    
    const pendingReportsCount = reports.filter(r => 
        !r.pubblicatoCliente && cantieriVisibiliIds.includes(r.cantiereId)
    ).length;

    const menuGroups = [
        {
            title: 'Principale',
            items: [
                { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, permissionKey: 'canViewDashboard' },
                { key: 'agenda', label: 'Agenda & Eventi', icon: CalendarDaysIcon, feature: 'agenda', permissionKey: 'canViewAgenda' },
            ]
        },
        {
            title: 'Area Clienti', 
            items: [
                { 
                    key: 'area-clienti-admin', 
                    label: 'Regia Portale Clienti', 
                    icon: BuildingStorefrontIcon, 
                    permissionKey: 'canViewClienti', 
                    badge: pendingReportsCount > 0 ? pendingReportsCount : null,
                    badgeColor: 'bg-red-500' 
                },
            ]
        },
        {
            title: 'Vendite & Incassi',
            items: [
                { key: 'clienti', label: 'Anagrafica Clienti', icon: BriefcaseIcon, permissionKey: 'canViewClienti' },
                { key: 'offerte', label: 'Preventivi e Offerte', icon: DocumentTextIcon, feature: 'offerte_management', permissionKey: 'canViewOfferte' },
                { key: 'fatturazione', label: 'Fatture di Vendita', icon: CurrencyDollarIcon, feature: 'fatturazione', permissionKey: 'canManageFatturazione' },
            ]
        },
        {
            title: 'Acquisti & Spese',
            items: [
                { key: 'richieste-offerta', label: 'Richieste Offerta (RDO)', icon: ClipboardDocumentCheckIcon, permissionKey: 'canManageFornitori' },
                { key: 'comparatore-prezzi', label: 'Comparatore Prezzi', icon: MagnifyingGlassIcon, permissionKey: 'canManageFornitori' },
                { key: 'ordini-acquisto', label: 'Ordini di Acquisto (ODA)', icon: ShoppingBagIcon, permissionKey: 'canManageFornitori' },
                { key: 'acquisti', label: 'Scadenzario Passivo', icon: DocumentTextIcon, permissionKey: 'canManageFornitori' },
            ]
        },
        {
            title: 'Cantieri & Logistica',
            items: [
                { key: 'gestione-operativa', label: 'Cantieri Attivi', icon: UserGroupIcon, permissionKey: 'canViewGestioneOperativa' },
                { key: 'programmazione', label: 'Programmazione', icon: ClockIcon, feature: 'programmazione_operativa', permissionKey: 'canViewProgrammazione' },
                { key: 'magazzino', label: 'Magazzino & Mezzi', icon: ShoppingCartIcon, permissionKey: 'canViewMagazzino' },
                { key: 'analisi-commessa', label: 'Analisi Economica', icon: ChartPieIcon, feature: 'analisi_commessa', permissionKey: 'canViewAnalisiCommessa' },
                { key: 'sicurezza', label: 'Sicurezza & DPI', icon: ShieldCheckIcon, permissionKey: 'canViewSicurezza' },
            ]
        },
        {
            title: 'Risorse & Anagrafiche',
            items: [
                { key: 'albo-fornitori', label: 'Albo Fornitori (Mat.)', icon: BuildingStorefrontIcon, permissionKey: 'canManageFornitori' },
                { key: 'subappaltatori', label: 'Albo Subappaltatori', icon: WrenchScrewdriverIcon, permissionKey: 'canManageFornitori' },
                { key: 'noleggiatori', label: 'Albo Noleggiatori', icon: TruckIcon, permissionKey: 'canManageFornitori' },
                { key: 'personale', label: 'Dipendenti / Squadre', icon: UsersIcon, permissionKey: 'canViewPersonale' },
                { key: 'presenze', label: 'Registro Presenze', icon: ClockIcon, permissionKey: 'canViewPersonale' },
            ]
        },
        {
            title: 'Azienda & Setup',
            items: [
                { key: 'documenti', label: 'Archivio Documenti', icon: DocumentTextIcon, feature: 'documenti', permissionKey: 'canViewDocumenti' },
                { key: 'settings', label: 'Impostazioni', icon: Cog6ToothIcon, permissionKey: 'canManageFatturazione' }, 
                { key: 'backup', label: 'Backup Dati', icon: ArchiveBoxArrowDownIcon, permissionKey: 'canManageFatturazione' },
            ]
        }
    ];

    const [openGroups, setOpenGroups] = useState(() => {
        const initialState = {};
        menuGroups.forEach(group => {
            const isActiveGroup = group.items.some(item => {
                if (item.subItems) return item.subItems.some(sub => sub.key === activeView);
                return item.key === activeView;
            });
            initialState[group.title] = isActiveGroup || group.title === 'Principale';
        });
        return initialState;
    });

    const [openSubMenus, setOpenSubMenus] = useState(() => {
        const initial = {};
        menuGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.subItems && item.subItems.some(sub => sub.key === activeView)) {
                    initial[item.key] = true;
                }
            });
        });
        return initial;
    });

    const toggleGroup = (title) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const toggleSubMenu = (key) => {
        setOpenSubMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        menuGroups.forEach(group => {
            if (group.items.some(item => {
                if (item.subItems && item.subItems.some(sub => sub.key === activeView)) {
                    setOpenSubMenus(prev => ({ ...prev, [item.key]: true }));
                    return true;
                }
                return item.key === activeView;
            })) {
                setOpenGroups(prev => ({ ...prev, [group.title]: true }));
            }
        });
    }, [activeView]);


    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
    };

    const isBlocking = loadingAuth || !user || !userRole || (!isSuperAdmin && !companyFeatures);

    if (isBlocking) {
        return (
            <div className="h-full w-64 flex flex-col text-white bg-gray-900">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold tracking-wide">Gestionale</h2>
                </div>
                <div className="flex-grow p-4">
                    <div className="animate-pulse space-y-4">
                         <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                         <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-64 flex flex-col bg-gray-900 text-gray-300 shadow-xl z-50">
            
            {/* Header Sidebar */}
            <div className="p-5 bg-gray-900 flex justify-between items-center sticky top-0 z-20 border-b border-gray-800">
                <div className="overflow-hidden">
                    <h2 className="text-lg font-bold text-white tracking-wider truncate">Gestionale</h2>
                    <p className="text-xs text-gray-500 truncate">{user.displayName || user.email}</p>
                </div>
                <NotificationBell onNavigate={onNavigate} />
            </div>
            
            {userRole === 'proprietario' && (
                <div className="px-2 py-2 bg-gray-800 border-b border-gray-700">
                    <AziendaSelector />
                </div>
            )}

            {cartellinoBadge && (
                <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                    {cartellinoBadge}
                </div>
            )}

            <nav className="flex-grow overflow-y-auto py-4 px-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                {menuGroups.map((group, idx) => {
                    const visibleItems = group.items.filter(item => {
                        if (isSuperAdmin) return true;
                        const features = companyFeatures || {};
                        const hasFeature = item.feature ? features[item.feature] === true : true;
                        const hasRolePermission = permissions[item.permissionKey] === true;
                        return hasFeature && hasRolePermission;
                    });

                    if (visibleItems.length === 0) return null;

                    const isOpen = openGroups[group.title];

                    return (
                        <div key={idx} className="mb-1">
                            <button 
                                onClick={() => toggleGroup(group.title)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors focus:outline-none"
                            >
                                <span>{group.title}</span>
                                {isOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                            </button>
                            
                            {isOpen && (
                                <ul className="space-y-1 mt-1 mb-3 animate-fade-in-down">
                                    {visibleItems.map(item => {
                                        if (item.subItems) {
                                            const visibleSubItems = item.subItems.filter(sub => {
                                                if (isSuperAdmin) return true;
                                                const features = companyFeatures || {};
                                                const hasFeature = sub.feature ? features[sub.feature] === true : true;
                                                const hasRolePermission = sub.permissionKey ? permissions[sub.permissionKey] === true : true;
                                                return hasFeature && hasRolePermission;
                                            });

                                            if (visibleSubItems.length === 0) return null;

                                            const isSubMenuOpen = openSubMenus[item.key];
                                            const hasActiveChild = visibleSubItems.some(sub => sub.key === activeView);

                                            return (
                                                <li key={item.key} className="mb-1">
                                                    <button
                                                        onClick={() => toggleSubMenu(item.key)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
                                                            hasActiveChild || isSubMenuOpen
                                                                ? 'bg-gray-800 text-white'
                                                                : 'hover:bg-gray-800 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${hasActiveChild || isSubMenuOpen ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white'}`} />
                                                            <span className="text-sm font-medium">{item.label}</span>
                                                        </div>
                                                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isSubMenuOpen ? 'rotate-180 text-indigo-400' : 'text-gray-500'}`} />
                                                    </button>
                                                    
                                                    {isSubMenuOpen && (
                                                        <ul className="mt-1 mb-2 space-y-1 border-l-2 border-gray-700 ml-5 pl-2 animate-fade-in-down">
                                                            {visibleSubItems.map(subItem => {
                                                                const isSubActive = activeView === subItem.key;
                                                                return (
                                                                    <li key={subItem.key}>
                                                                        <button
                                                                            onClick={() => onNavigate(subItem.key)}
                                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                                                                                isSubActive 
                                                                                ? 'bg-indigo-600 text-white shadow-md translate-x-1' 
                                                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            <subItem.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isSubActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
                                                                            <span className="text-sm font-medium">{subItem.label}</span>
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </li>
                                            );
                                        }

                                        const isActive = activeView === item.key;
                                        return (
                                            <li key={item.key}>
                                                <button
                                                    onClick={() => onNavigate(item.key)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
                                                        isActive 
                                                        ? 'bg-indigo-600 text-white shadow-md translate-x-1' 
                                                        : 'hover:bg-gray-800 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                                        <span className="text-sm font-medium">{item.label}</span>
                                                    </div>
                                                    
                                                    {item.badge && (
                                                        <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full ${item.badgeColor || 'bg-blue-500'} px-1.5 text-[10px] font-bold text-white shadow-sm`}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}

                {/* 🌟 SEZIONE GOD MODE (Amministratore Piattaforma) */}
                {isSuperAdmin && (
                    <div className="pt-4 mt-2 border-t border-gray-800">
                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Admin Piattaforma
                        </div>
                        
                        <button
                            onClick={() => onNavigate('admin-aziende')}
                            className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white ${
                                activeView === 'admin-aziende' ? 'bg-indigo-600 text-white' : ''
                            }`}
                        >
                            <ShieldCheckIcon className={`h-5 w-5 ${activeView === 'admin-aziende' ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">Gestione Aziende</span>
                        </button>

                        <button
                            onClick={() => onNavigate('listini')}
                            className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white ${
                                activeView === 'listini' ? 'bg-indigo-600 text-white' : ''
                            }`}
                        >
                            <ClipboardDocumentListIcon className={`h-5 w-5 ${activeView === 'listini' ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">Listini Master (God Mode)</span>
                        </button>

                        <button
                            onClick={() => onNavigate('big-data')}
                            className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white ${
                                activeView === 'big-data' ? 'bg-indigo-600 text-white' : ''
                            }`}
                        >
                            <GlobeEuropeAfricaIcon className={`h-5 w-5 ${activeView === 'big-data' ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">Big Data Analytics</span>
                        </button>

                        <button
                            onClick={() => onNavigate('catalogo-risorse')}
                            className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white ${
                                activeView === 'catalogo-risorse' ? 'bg-indigo-600 text-white' : ''
                            }`}
                        >
                            <ListBulletIcon className={`h-5 w-5 ${activeView === 'catalogo-risorse' ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">Dizionario Globale</span>
                        </button>

                        {/* 🌟 NUOVO TASTO SIMULATORE GARE 🌟 */}
                        <button
                            onClick={() => onNavigate('simulatore')}
                            className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg transition-all duration-200 hover:bg-gray-800 hover:text-white ${
                                activeView === 'simulatore' ? 'bg-indigo-600 text-white' : ''
                            }`}
                        >
                            <BeakerIcon className={`h-5 w-5 ${activeView === 'simulatore' ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">Simulatore Gare</span>
                        </button>

                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-gray-800 bg-gray-900">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-white hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                >
                    <PowerIcon className="h-5 w-5" />
                    <span>Esci</span>
                </button>
            </div>
        </div>
    );
};