// File: apps/gestionale/src/components/PresenzeDashboard.jsx

import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// --- Funzioni di Utilità per le Date ---

// Restituisce un array di giorni (Date) per un dato mese/anno
const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

// Formatta un timestamp di Firestore (o una data JS) in una stringa "YYYY-MM-DD"
const toDayString = (ts) => {
    const date = ts?.toDate ? ts.toDate() : ts;
    return date.toISOString().split('T')[0];
};

// Calcola la durata in ore tra due timestamp
const calcolaOre = (inizio, fine) => {
    if (!inizio || !fine) return 0;
    const inizioMs = inizio.toDate().getTime();
    const fineMs = fine.toDate().getTime();
    return (fineMs - inizioMs) / (1000 * 60 * 60); // Millisecondi -> Ore
};

// --- Componente Principale ---

export const PresenzeDashboard = ({ users, presenze, companyID, onBack }) => {
    
    // Stato per gestire il mese visualizzato
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Elaborazione Dati (Il "Cervello") ---
    const { dipendentiAzienda, giorniDelMese, righeTabella } = useMemo(() => {
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 1. Filtra i dipendenti (escludendo titolare, ecc.)
        const dipendenti = users.filter(
            u => u.companyID === companyID && 
                 u.ruolo !== 'titolare-azienda' && 
                 u.ruolo !== 'proprietario'
        ).sort((a, b) => a.cognome.localeCompare(b.cognome));

        // 2. Ottieni i giorni del mese
        const giorni = getDaysInMonth(year, month);

        // 3. Pre-processa le presenze per una ricerca rapida
        // Creiamo una Mappa: Map<userId, Map<giornoString, oreTotali>>
        const presenzeMap = new Map();
        
        for (const p of presenze) {
            // Ignora timbrature non di questa azienda o senza orari
            if (p.companyID !== companyID || !p.timestampInizio || !p.timestampFine) {
                continue;
            }

            const pDate = p.timestampInizio.toDate();
            // Ignora timbrature non di questo mese/anno
            if (pDate.getFullYear() !== year || pDate.getMonth() !== month) {
                continue;
            }

            const userId = p.utenteID;
            const giornoString = toDayString(pDate);
            const ore = calcolaOre(p.timestampInizio, p.timestampFine);

            if (!presenzeMap.has(userId)) {
                presenzeMap.set(userId, new Map());
            }
            
            const userMap = presenzeMap.get(userId);
            const oreEsistenti = userMap.get(giornoString) || 0;
            userMap.set(giornoString, oreEsistenti + ore);
        }

        // 4. Costruisci le righe della tabella
        const righe = dipendenti.map(user => {
            const celleGiorni = giorni.map(giorno => {
                const giornoString = toDayString(giorno);
                const oreLavorate = presenzeMap.get(user.id)?.get(giornoString);
                
                if (oreLavorate === undefined) return { giorno: giornoString, display: 'N/D' };
                return { giorno: giornoString, display: oreLavorate.toFixed(1) };
            });

            return {
                id: user.id,
                nomeCompleto: `${user.cognome} ${user.nome}`,
                giorni: celleGiorni
            };
        });

        return { 
            dipendentiAzienda: dipendenti, 
            giorniDelMese: giorni, 
            righeTabella: righe 
        };

    }, [currentDate, users, presenze, companyID]);

    // --- Handlers per cambiare mese ---
    const cambiaMese = (incremento) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + incremento, 1));
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in">
            {/* --- Header e Navigazione Mese --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Indietro
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard Presenze</h1>
                </div>
                
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <button onClick={() => cambiaMese(-1)} className="p-2 rounded-md hover:bg-gray-100">
                        <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <span className="text-xl font-semibold text-gray-700 w-48 text-center capitalize">
                        {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => cambiaMese(1)} className="p-2 rounded-md hover:bg-gray-100">
                        <ChevronRightIcon className="h-6 w-6 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* --- Tabella Presenze --- */}
            {righeTabella.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                                    Dipendente
                                </th>
                                {giorniDelMese.map(giorno => (
                                    <th key={giorno.getDate()} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {giorno.getDate()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {righeTabella.map(riga => (
                                <tr key={riga.id} className="hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 z-10">
                                        {riga.nomeCompleto}
                                    </td>
                                    {riga.giorni.map((cella, index) => (
                                        <td key={index} className={`px-4 py-4 whitespace-nowrap text-sm text-center ${cella.display === 'N/D' ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {cella.display}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">Nessun dipendente trovato per questa azienda.</p>
            )}
        </div>
    );
};