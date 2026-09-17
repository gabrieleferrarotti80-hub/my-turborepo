import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix icone di default di Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export const MappaPercorsiEmbed = ({ percorsi, reports, userId, cantiereId, loading, personnelMap, onTotalDistanceChange }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupRef = useRef(null);
    
    const [routingMode, setRoutingMode] = useState('aria');
    const [localDistance, setLocalDistance] = useState(0);

    // ✅ LOGICA FOTO INTELLIGENTE: Assegnazione univoca per evitare duplicati
    const allPoints = useMemo(() => {
        if (!percorsi || !Array.isArray(percorsi)) return [];
        let validPoints = [];
        const usedReportIds = new Set(); // <-- Memoria delle foto già usate
        
        percorsi.forEach(giorno => {
            if (giorno.points && Array.isArray(giorno.points)) {
                giorno.points.forEach((pt, ptIndex) => {
                    if (pt && pt.lat != null && pt.lng != null) {
                        const lat = Number(pt.lat);
                        const lng = Number(pt.lng);
                        
                        if (!isNaN(lat) && !isNaN(lng)) {
                            // 1. Identifica l'autore
                            const pointUserId = pt.userId || pt.autoreId || pt.uid || userId;
                            const label = personnelMap ? (personnelMap[pointUserId] || 'Sconosciuto') : 'Utente';
                            
                            // 2. Cerca la foto
                            let photoUrl = pt.fileUrl || pt.photoUrl || pt.url || pt.photo || pt.immagine || null;

                            if (!photoUrl && reports && Array.isArray(reports)) {
                                
                                // Cerca per ID esatto assicurandosi che non sia già stato usato
                                let matchingReport = reports.find(r => (r.id === pt.id || r.id === pt.reportId) && !usedReportIds.has(r.id));

                                // Ricerca intelligente (solo tra i report non ancora usati)
                                if (!matchingReport) {
                                    const possibleReports = reports.filter(r => {
                                        if (usedReportIds.has(r.id)) return false; // Salta le foto già messe in altri marker!
                                        
                                        const rUserId = r.userId || r.autoreId || r.uid;
                                        if (rUserId !== pointUserId) return false;

                                        let rDateStr = "";
                                        if (r.createdAt?.toDate) {
                                            rDateStr = r.createdAt.toDate().toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit', year: 'numeric'});
                                        } else {
                                            const d = new Date(r.createdAt);
                                            if (!isNaN(d.getTime())) rDateStr = d.toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit', year: 'numeric'});
                                        }
                                        return rDateStr === giorno.date;
                                    });

                                    // Filtra solo quelli che hanno davvero un'immagine
                                    const reportsWithPhotos = possibleReports.filter(r => r.fileUrl || r.fotoUrl || r.immagineUrl || (r.fotografie && r.fotografie.length > 0));

                                    if (reportsWithPhotos.length > 0) {
                                        // Ordina dal più vecchio al più nuovo
                                        reportsWithPhotos.sort((a, b) => {
                                            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                                            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                                            return timeA - timeB;
                                        });

                                        const isStart = ptIndex === 0;
                                        const isEnd = ptIndex === giorno.points.length - 1 && ptIndex > 0;

                                        if (isStart) {
                                            // All'inizio: cerca report di "inizio" o usa il più vecchio
                                            matchingReport = reportsWithPhotos.find(r => r.tipologia?.toLowerCase().includes('iniz')) || reportsWithPhotos[0];
                                        } else if (isEnd) {
                                            // Alla fine: cerca report di "fine" o usa il più recente
                                            matchingReport = reportsWithPhotos.find(r => r.tipologia?.toLowerCase().includes('fine')) || reportsWithPhotos[reportsWithPhotos.length - 1];
                                        }
                                    }
                                }

                                // Se abbiamo trovato un report valido
                                if (matchingReport) {
                                    usedReportIds.add(matchingReport.id); // Registra come USATO
                                    photoUrl = matchingReport.fileUrl || matchingReport.fotoUrl || matchingReport.immagineUrl;
                                    if (!photoUrl && matchingReport.fotografie && Array.isArray(matchingReport.fotografie) && matchingReport.fotografie.length > 0) {
                                        photoUrl = typeof matchingReport.fotografie[0] === 'object' ? matchingReport.fotografie[0].url : matchingReport.fotografie[0];
                                    }
                                }
                            }

                            validPoints.push({
                                ...pt,
                                lat,
                                lng,
                                date: giorno.date,
                                userLabel: label,
                                fileUrl: photoUrl || null 
                            });
                        }
                    }
                });
            }
        });
        return validPoints;
    }, [percorsi, reports, userId, personnelMap]);

    // EFFETTO 1: Inizializzazione Mappa
    useEffect(() => {
        if (loading || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current).setView([41.9028, 12.4964], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            const featureGroup = L.featureGroup().addTo(map);
            
            mapInstanceRef.current = map;
            layerGroupRef.current = featureGroup;
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                layerGroupRef.current = null;
            }
        };
    }, [loading]);

    // EFFETTO 2: Disegno Percorsi e Popup
    useEffect(() => {
        const map = mapInstanceRef.current;
        const layerGroup = layerGroupRef.current;

        if (!map || !layerGroup) return;
        layerGroup.clearLayers();

        if (allPoints.length === 0) {
            setLocalDistance(0);
            if (onTotalDistanceChange) onTotalDistanceChange(0);
            return;
        }

        // --- Disegno Marker con Foto ---
        allPoints.forEach((pt, index) => {
            let badge = '';
            if (index === 0) badge = `<div style="background:#22c55e; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">INIZIO</div>`;
            if (index === allPoints.length - 1 && allPoints.length > 1) badge = `<div style="background:#ef4444; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">FINE</div>`;

            let popupHtml = `
                <div style="min-width: 160px; text-align: center; font-family: sans-serif;">
                    ${badge}
                    <strong style="display:block; font-size: 14px; margin-bottom: 2px;">${pt.userLabel}</strong>
                    <span style="font-size: 11px; color: #6b7280;">${pt.date || ''} ${pt.time || ''}</span>
                    <div style="margin-top: 6px; font-size: 13px; color: #374151;">${pt.info || pt.tipologia || 'Segnaposto'}</div>
            `;
            
            if (pt.fileUrl && typeof pt.fileUrl === 'string' && pt.fileUrl.startsWith('http')) {
                popupHtml += `
                    <div style="margin-top: 10px;">
                        <a href="${pt.fileUrl}" target="_blank" style="display:block; cursor: pointer;">
                            <img src="${pt.fileUrl}" 
                                 style="width: 100%; max-height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" 
                                 alt="Foto Report" 
                                 onerror="this.parentElement.style.display='none';" 
                            />
                        </a>
                        <span style="font-size: 10px; color: #9ca3af; display:block; margin-top:4px;">Clicca per ingrandire</span>
                    </div>
                `;
            }
            popupHtml += `</div>`;

            L.marker([pt.lat, pt.lng]).bindPopup(popupHtml).addTo(layerGroup);
        });

        // --- Calcolo Distanza (Linea d'Aria) ---
        const drawAria = () => {
            const latlngs = allPoints.map(p => L.latLng(p.lat, p.lng));
            L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '8, 8' }).addTo(layerGroup);
            
            let dist = 0;
            for (let i = 0; i < latlngs.length - 1; i++) {
                dist += latlngs[i].distanceTo(latlngs[i+1]);
            }
            setLocalDistance(dist);
            if (onTotalDistanceChange) onTotalDistanceChange(dist);
        };

        // --- Calcolo Distanza (Strada tramite OSRM) ---
        const drawStrada = async () => {
            if (allPoints.length < 2) { drawAria(); return; }
            try {
                const pointsToRoute = allPoints.slice(0, 100);
                const coordsStr = pointsToRoute.map(p => `${p.lng},${p.lat}`).join(';');
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
                if (!response.ok) throw new Error("Errore API");
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const routeLatLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    L.polyline(routeLatLngs, { color: '#ef4444', weight: 5, opacity: 0.8 }).addTo(layerGroup);
                    setLocalDistance(data.routes[0].distance);
                    if (onTotalDistanceChange) onTotalDistanceChange(data.routes[0].distance);
                } else { drawAria(); }
            } catch (error) { drawAria(); }
        };

        const drawRoute = async () => {
            if (routingMode === 'strada') await drawStrada(); else drawAria();
            try {
                const bounds = layerGroup.getBounds();
                if (Object.keys(bounds).length > 0) map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) {}
        };

        drawRoute();

    }, [allPoints, routingMode, onTotalDistanceChange]);

    if (loading) {
        return <div className="h-[600px] w-full flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 font-medium">Caricamento mappa...</div>;
    }

    const displayMap = allPoints.length > 0 ? "block" : "none";
    const displayEmpty = allPoints.length === 0 ? "flex" : "none";

    return (
        <div className="relative w-full h-[600px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            
            {allPoints.length > 0 && (
                <div className="absolute top-4 right-4 z-[400] bg-white p-3 rounded-lg shadow-md border border-gray-200 print:hidden flex flex-col gap-2">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Distanza Totale</span>
                        <p className="text-lg font-bold text-gray-800">{(localDistance / 1000).toFixed(2)} km</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button onClick={() => setRoutingMode('aria')} className={`px-3 py-1 text-xs font-medium rounded-sm w-full transition-all ${routingMode === 'aria' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Aria</button>
                        <button onClick={() => setRoutingMode('strada')} className={`px-3 py-1 text-xs font-medium rounded-sm w-full transition-all ${routingMode === 'strada' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Strada</button>
                    </div>
                </div>
            )}

            <div style={{ display: displayEmpty }} className="absolute inset-0 items-center justify-center text-gray-500 font-medium z-10">
                Nessuna coordinata GPS valida trovata per questa selezione.
            </div>
            
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%', display: displayMap, zIndex: 1 }} />
        </div>
    );
};