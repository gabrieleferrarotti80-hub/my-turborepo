import React from 'react';
import { CloudArrowUpIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

const ToolbarButton = ({ label, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {label}
    </button>
);

export const PlanningToolbar = ({
    modalitaCorrente,
    visioneCorrente,
    zoomCorrente,
    canManage,
    onModalitaToggle,
    onVisioneToggle,
    onZoomToggle,
    onPublish,
    isPublishing,
    onConferma, 
    isConfirming,
    labelModalita1 = 'Bozza', 
    labelModalita2 = 'Live',   
}) => {

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border-b shadow-sm">
            
            {/* --- Selettore Modalità --- */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <ToolbarButton
                    label={labelModalita1} 
                    isActive={modalitaCorrente === 'programmazione'}
                    onClick={() => onModalitaToggle('programmazione')}
                    disabled={isPublishing || isConfirming}
                />
                <ToolbarButton
                    label={labelModalita2} 
                    isActive={modalitaCorrente === 'cronoprogramma'}
                    onClick={() => onModalitaToggle('cronoprogramma')}
                    disabled={isPublishing || isConfirming}
                />
            </div>

            {/* --- Selettore Visione --- */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <ToolbarButton
                    label="Risorsa"
                    isActive={visioneCorrente === 'risorsa'}
                    onClick={() => onVisioneToggle('risorsa')}
                />
                <ToolbarButton
                    label="Gantt"
                    isActive={visioneCorrente === 'gantt'}
                    onClick={() => onVisioneToggle('gantt')}
                />
            </div>

            {/* --- Selettore Zoom (AGGIORNATO CON VISTA GIORNO) --- */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                <ToolbarButton label="Giorno" isActive={zoomCorrente === 'day'} onClick={() => onZoomToggle('day')} />
                <ToolbarButton label="Settimana" isActive={zoomCorrente === 'week'} onClick={() => onZoomToggle('week')} />
                <ToolbarButton label="Mese" isActive={zoomCorrente === 'month'} onClick={() => onZoomToggle('month')} />
                <ToolbarButton label="Anno" isActive={zoomCorrente === 'year'} onClick={() => onZoomToggle('year')} />
            </div>

            <div className="flex-1" /> 

            {/* --- Pulsanti Azione --- */}
            <div className="flex items-center gap-2">
                {modalitaCorrente === 'programmazione' && canManage && (
                    <button
                        onClick={onPublish}
                        disabled={isPublishing || isConfirming}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <CloudArrowUpIcon className="h-5 w-5" />
                        {isPublishing ? 'Pubblicazione...' : 'Pubblica Modifiche'}
                    </button>
                )}
            </div>
        </div>
    );
};