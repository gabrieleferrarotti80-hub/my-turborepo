import React, { useState, useEffect } from 'react';
// Importiamo i componenti di React Leaflet
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // ⚠️ FONDAMENTALE: Importa il CSS di Leaflet
import L from 'leaflet';

// --- FIX ICONE LEAFLET (Bug noto in React) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// ---------------------------------------------

import { useFirebaseData, usePercorsiManager } from 'shared-core';
import { UserSelector } from 'shared-ui';

// Componente helper per centrare la mappa quando cambiano i percorsi
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 13);
        }
    }, [center, map]);
    return null;
};

const centerDefault = [41.9028, 12.4964]; // Roma (Leaflet usa Array [lat, lng])

export const MappaPercorsiView = () => {
    const { db, userAziendaId } = useFirebaseData();
    const { percorsi, loading, fetchPercorsi } = usePercorsiManager(db, userAziendaId);
    
    const [selectedUser, setSelectedUser] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mapCenter, setMapCenter] = useState(centerDefault);

    const handleSearch = () => {
        if(selectedUser && startDate && endDate) {
            const start = new Date(startDate); start.setHours(0,0,0);
            const end = new Date(endDate); end.setHours(23,59,59);
            fetchPercorsi(selectedUser, start, end);
        }
    };

    // Quando arrivano nuovi percorsi, centra la mappa sul primo punto
    useEffect(() => {
        if (percorsi.length > 0 && percorsi[0].segments.length > 0) {
            const primoPunto = percorsi[0].segments[0].start;
            // Leaflet vuole [lat, lng]
            setMapCenter([primoPunto.lat, primoPunto.lng]); 
        }
    }, [percorsi]);

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">📍 Mappa Spostamenti (OpenStreetMap)</h2>

            {/* --- FILTRI (Identici a prima) --- */}
            <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-4 items-end">
                <div className="w-64">
                    <label className="text-sm font-semibold text-gray-600">Squadra</label>
                    <UserSelector onSelect={setSelectedUser} value={selectedUser} />
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-600">Dal</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-600">Al</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full p-2 border rounded" />
                </div>
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Caricamento...' : 'Cerca'}
                </button>
            </div>

            {/* --- MAPPA LEAFLET --- */}
            <div className="bg-white p-2 rounded-xl shadow h-[600px] w-full overflow-hidden relative z-0">
                <MapContainer 
                    center={centerDefault} 
                    zoom={6} 
                    style={{ height: "100%", width: "100%", borderRadius: "12px" }}
                >
                    {/* TileLayer è lo sfondo della mappa (OpenStreetMap Server) */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapUpdater center={mapCenter} />

                    {percorsi.map((giorno) => (
                        <React.Fragment key={giorno.date}>
                            {giorno.segments.map((segmento, idx) => (
                                <React.Fragment key={idx}>
                                    {/* Linea del percorso */}
                                    <Polyline
                                        positions={[
                                            [segmento.start.lat, segmento.start.lng],
                                            [segmento.end.lat, segmento.end.lng]
                                        ]}
                                        pathOptions={{ color: giorno.color, weight: 5 }}
                                    />
                                    
                                    {/* Marker Inizio */}
                                    <Marker position={[segmento.start.lat, segmento.start.lng]}>
                                        <Popup>
                                            <strong>Inizio: {segmento.info}</strong><br/>
                                            {giorno.date}
                                        </Popup>
                                    </Marker>

                                    {/* Marker Fine (Opzionale, magari con icona diversa) */}
                                    <Marker position={[segmento.end.lat, segmento.end.lng]}>
                                        <Popup>
                                            <strong>Fine: {segmento.info}</strong>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </MapContainer>
            </div>

            {/* --- LEGENDA --- */}
            <div className="flex gap-4 flex-wrap">
                {percorsi.map(p => (
                    <div key={p.date} className="flex items-center gap-2 bg-white px-3 py-1 rounded shadow text-sm border border-gray-200">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="font-medium">{p.date}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};