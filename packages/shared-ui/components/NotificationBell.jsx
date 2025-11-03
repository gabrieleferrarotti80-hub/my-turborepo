import React, { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

export const NotificationBell = ({ notifiche = [], onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    const unreadNotifiche = notifiche.filter(n => !n.letta);
    const unreadCount = unreadNotifiche.length;

    const handleItemClick = (notifica) => {
        if (onNotificationClick) {
            onNotificationClick(notifica); // Delega la logica al componente genitore
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-gray-700">
                <BellIcon className="h-6 w-6 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20">
                    <div className="p-4 font-bold border-b">Notifiche</div>
                    <ul className="py-2 max-h-96 overflow-y-auto">
                        {notifiche.length > 0 ? (
                            notifiche.map(n => (
                                <li 
                                    key={n.id}
                                    onClick={() => handleItemClick(n)}
                                    className={`px-4 py-3 hover:bg-gray-100 cursor-pointer ${!n.letta ? 'font-bold' : 'font-normal text-gray-600'}`}
                                >
                                    <p className="text-sm">{n.messaggio}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {n.createdAt?.toDate().toLocaleDateString('it-IT')}
                                    </p>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-gray-500">Nessuna notifica.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};