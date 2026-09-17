import React, { useEffect, useRef } from 'react';
import { CubeIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Draggable } from '@fullcalendar/interaction';

const FaseItem = ({ fase }) => {
    const elRef = useRef(null);
    // Usa un ref per l'istanza Draggable per sopravvivere a Strict Mode
    const draggableInstanceRef = useRef(null);

    useEffect(() => {
        // Crea l'istanza solo se il ref è vuoto
        if (elRef.current && !draggableInstanceRef.current) {
            
            draggableInstanceRef.current = new Draggable(elRef.current, {
                itemSelector: '.fc-event-item',
                eventData: (eventEl) => ({
                    title: fase.nome,
                    create: false
                    // Non passiamo extendedProps, usiamo l'attributo data-*
                })
            });
        }

        // Funzione di pulizia robusta
        return () => {
            if (draggableInstanceRef.current) {
                draggableInstanceRef.current.destroy();
                draggableInstanceRef.current = null;
            }
        };
        
    }, [fase.id, fase.nome]); // Dipendenze stabili

    return (
        <li
            ref={elRef}
            // --- ✅ IMPOSTA L'ID DIRETTAMENTE QUI ---
            data-faseid={fase.id} 
            className="fc-event-item p-3 bg-white rounded-lg shadow-sm border border-gray-200 cursor-move hover:bg-indigo-50 hover:shadow-md transition-all"
        >
            <div className="flex items-center gap-3 pointer-events-none">
                <CubeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                    <p className="font-medium text-sm text-gray-900">{fase.nome}</p>
                    <p className="text-xs text-gray-500">{fase.cantiereNome}</p> 
                </div>
            </div>
        </li>
    );
};

   

/**
 * Componente UI "stupido" per la sidebar dei lavori da programmare.
 */
export const UnscheduledSidebar = ({ fasi, isLoading }) => {

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-32">
                    <ArrowPathIcon className="animate-spin h-6 w-6 text-gray-500" />
                </div>
            );
        }

        if (!fasi || fasi.length === 0) {
            return <p className="p-4 text-sm text-gray-500">Nessun lavoro da programmare.</p>;
        }

        return (
            <ul className="space-y-2">
                {fasi.map(fase => (
                    <FaseItem key={fase.id} fase={fase} />
                ))}
            </ul>
        );
    };

    return (
        <aside className="w-64 h-full bg-gray-100 border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-gray-100 z-10">
                <h3 className="text-lg font-semibold text-gray-900">Lavori da Programmare</h3>
            </div>
            <div className="p-4">
                {renderContent()}
            </div>
        </aside>
    );
};