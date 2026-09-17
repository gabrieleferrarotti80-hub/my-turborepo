import React, { useRef, useEffect, useCallback } from 'react'; 
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction'; 
import itLocale from '@fullcalendar/core/locales/it'; 

export const TimelineScheduler = ({
    tasks,
    resources,
    view,          
    isReadOnly,
    onTaskMove,
    onTaskCreate,
    onTaskClick,
}) => {
    
    const calendarRef = useRef(null); 

    const mapZoomToView = useCallback(() => {
        switch(view) {
            case 'day': return 'resourceTimelineDay';
            case 'month': return 'resourceTimelineMonth';
            case 'year': return 'resourceTimelineYear';
            case 'week':
            default: return 'resourceTimelineWeek';
        }
    }, [view]); 

    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            const newView = mapZoomToView();
            if (calendarApi.view.type !== newView) {
                calendarApi.changeView(newView);
            }
        }
    }, [view, mapZoomToView]); 

    const handleEventDrop = (dropInfo) => {
        if (onTaskMove) {
            onTaskMove({
                taskId: dropInfo.event.id,
                newStart: dropInfo.event.start,
                newEnd: dropInfo.event.end,
                newResourceId: dropInfo.newResource?.id || dropInfo.oldResource?.id,
            });
        }
    };

    
    // 🌟 FIX: Lettura JSON e rimozione dei fantasmi
    const handleExternalDrop = (dropInfo) => {
        if (onTaskCreate) {
            let dragData = {};
            try { 
                dragData = JSON.parse(dropInfo.draggedEl.getAttribute('data-event')) || {}; 
            } catch(e) { 
                dragData = dropInfo.draggedEl.dataset || {}; 
            }

            onTaskCreate({
                faseId: dragData.faseId || dragData.faseid,     
                cantiereId: dragData.cantiereId || dragData.cantiereid, 
                newStart: dropInfo.date,
                newEnd: null, 
                newResourceId: dropInfo.resource?.id,
            });

            // Rimuove immediatamente l'evento "finto" creato da FullCalendar
            // lasciando solo quello vero governato da React
            if (calendarRef.current) {
                const api = calendarRef.current.getApi();
                api.getEvents().forEach(ev => {
                    if (!ev.id || ev.id === '') ev.remove();
                });
            }
        }
    };

    const handleEventClick = (clickInfo) => {
        // 🔥 SPIA DI FULLCALENDAR
        console.log("🔎 [Timeline] CLICK NATIVO FULLCALENDAR:", clickInfo);
        console.log("🔎 [Timeline] ID EVENTO:", clickInfo.event.id);
        console.log("🔎 [Timeline] PROPRIETÀ ESTESE:", clickInfo.event.extendedProps);

        if (onTaskClick) {
            // Passiamo l'intero oggetto evento, non solo l'ID, così abbiamo tutto a disposizione!
            onTaskClick(clickInfo.event); 
        }
    };

    return (
        <div className="h-full w-full p-4 bg-white">
            <FullCalendar
                ref={calendarRef} 
                plugins={[resourceTimelinePlugin, interactionPlugin]}
                initialView={mapZoomToView()}
                headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                locale={itLocale}
                views={{
                    resourceTimelineWeek: { slotDuration: { days: 1 } },
                    resourceTimelineDay: { slotDuration: { hours: 1 } }
                }}
                resources={resources}
                events={tasks}
                editable={!isReadOnly}
                selectable={!isReadOnly}
                droppable={!isReadOnly}
                eventDrop={handleEventDrop}
                drop={handleExternalDrop}
                eventClick={handleEventClick} // <-- Agganciato
                schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives" 
                resourceAreaHeaderContent="Risorse"
                slotMinWidth={70} 
                contentHeight="auto" 
            />
        </div>
    );
};