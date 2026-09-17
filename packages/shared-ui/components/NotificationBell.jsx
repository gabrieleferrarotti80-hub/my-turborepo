// packages/shared-ui/components/NotificationBell.jsx

import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { doc, updateDoc } from 'firebase/firestore'; 
// ✅ Importiamo 'db' direttamente da shared-core!
import { useFirebaseData, db } from 'shared-core'; 

export const NotificationBell = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const context = useFirebaseData() || {};
    
    // ✅ Usiamo la prop 'db' se passata, altrimenti usiamo direttamente l'istanza importata!
    const activeDb = props.db || db;
    
    const notifiche = (props.notifiche && props.notifiche.length > 0) 
        ? props.notifiche 
        : (context.data?.notifiche || []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadNotifications = notifiche.filter(n => n.letta === false || n.read === false);
    const unreadCount = unreadNotifications.length;

    const sortedNotifications = [...notifiche].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || a.data || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.data || 0);
        return dateB - dateA;
    });

    const markAsRead = async (notificaId, e) => {
        if (e) e.stopPropagation();
        
        // Controllo di sicurezza
        if (!activeDb) {
            console.error("❌ ERRORE: L'istanza di Firebase 'db' non è disponibile!");
            return;
        }
        
        try {
            await updateDoc(doc(activeDb, 'notifiche', notificaId), { letta: true, read: true });
        } catch (error) {
            console.error("Errore nell'aggiornamento:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!activeDb) {
            console.error("❌ ERRORE: L'istanza di Firebase 'db' non è disponibile!");
            return;
        }
        
        try {
            const updatePromises = unreadNotifications.map(n => updateDoc(doc(activeDb, 'notifiche', n.id), { letta: true, read: true }));
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Errore:", error);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date)) return '';
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    };

    const handleNotificationClick = (notifica) => {
        if (notifica.letta === false || notifica.read === false) {
            markAsRead(notifica.id);
        }
        setIsOpen(false);

        const tipo = notifica.tipo || notifica.type;
        
        if (tipo === 'approvazione_offerta' && notifica.offertaId) {
            localStorage.setItem('APRI_OFFERTA_ID', notifica.offertaId);
            
            if (props.onNavigate) {
                props.onNavigate('offerte');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('openOffertaFromNotif'));
                }, 150);
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors focus:outline-none">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full shadow-sm animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                // 🌟 ECCO IL FIX: z-[9999] aggiunto qui sotto 🌟
                <div className="absolute left-0 mt-4 w-80 sm:w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200 z-[9999] overflow-hidden transform opacity-100 scale-100 transition-all origin-top-left">
                    <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Notifiche</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                                <CheckIcon className="h-3 w-3" /> Segna tutte come lette
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {sortedNotifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-400 font-medium">Nessuna notifica presente.</div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {sortedNotifications.map((notifica) => {
                                    const isUnread = notifica.letta === false || notifica.read === false;
                                    return (
                                        <li 
                                            key={notifica.id} 
                                            onClick={() => handleNotificationClick(notifica)}
                                            className={`p-5 transition-colors flex gap-3 cursor-pointer group ${isUnread ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <p className={`text-sm ${isUnread ? 'font-black text-indigo-900' : 'font-bold text-slate-700'}`}>
                                                        {notifica.titolo || notifica.title || "Nuova Notifica"}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 font-medium">
                                                        {formatTime(notifica.createdAt || notifica.data)}
                                                    </span>
                                                </div>
                                                <p className={`text-xs leading-relaxed ${isUnread ? 'text-indigo-800 font-medium' : 'text-slate-500'}`}>
                                                    {notifica.messaggio || notifica.message}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};