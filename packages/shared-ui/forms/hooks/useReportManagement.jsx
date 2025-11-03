// src/hooks/useReportManagement.js

import { useState, useMemo } from 'react';

/**
 * Hook customizzato per gestire il filtraggio, la ricerca e l'ordinamento dei dati dei report.
 * @param {Array} reports - Lista grezza dei report.
 * @param {string} userAziendaId - ID dell'azienda per filtrare i report.
 * @param {Object} maps - Oggetto contenente usersMap, cantieriMap, companyMap.
 * @returns {Object} Contiene reports filtrati/ordinati e le funzioni di controllo.
 */
export const useReportManagement = (reports, userAziendaId, maps) => {
    const { usersMap, cantieriMap, companyMap } = maps;

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); 
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'descending' });

    // Funzione per gestire l'ordinamento
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const finalSortedItems = useMemo(() => {
        let items = reports || [];

        // 1. Filtro per Azienda (Fisso e Prioritario)
        items = userAziendaId
            ? items.filter(report => report.companyID === userAziendaId)
            : items;

        // 2. Filtro per Data
        const now = new Date();
        items = items.filter(report => {
            if (dateFilter === 'all') {
                return true;
            }
            // Qui usiamo report.data, che dovrebbe essere un oggetto Date dopo il parsing del '../context/shared-core/context/FirebaseContext.jsx'.
            // Se fosse ancora un Timestamp, la conversione a toDate() è necessaria qui per la data filter logic
            const reportDate = report.data?.toDate ? report.data.toDate() : report.data; 
            if (!(reportDate instanceof Date) || isNaN(reportDate)) return false;

            const diffInDays = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
            const isToday = now.getFullYear() === reportDate.getFullYear() &&
                            now.getMonth() === reportDate.getMonth() &&
                            now.getDate() === reportDate.getDate();

            if (dateFilter === 'today') return isToday;
            if (dateFilter === 'last7days') return diffInDays <= 7;
            if (dateFilter === 'last30days') return diffInDays <= 30;
            return true;
        });

        // 3. Filtro di Ricerca (Search)
        const lowerCaseSearchTerm = searchTerm ? searchTerm.toLowerCase() : '';
        items = items.filter(report => {
            const userName = maps.usersMap[report.userId] || '';
            const cantiereName = maps.cantieriMap[report.cantiereId] || '';
            const companyName = maps.companyMap[report.companyID] || '';
            const reportType = report.tipologia || '';
            
            return (
                userName.toLowerCase().includes(lowerCaseSearchTerm) ||
                cantiereName.toLowerCase().includes(lowerCaseSearchTerm) ||
                companyName.toLowerCase().includes(lowerCaseSearchTerm) ||
                reportType.toLowerCase().includes(lowerCaseSearchTerm) ||
                (report.isArtifact ? 'artifact' : '').toLowerCase().includes(lowerCaseSearchTerm)
            );
        });

        // 4. Ordinamento
        let finalSortedItems = [...items].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            // Gestione dei valori per l'ordinamento basato sulla mappa (Operatore, Cantiere, Azienda)
            if (sortConfig.key === 'userId') {
                aValue = maps.usersMap[a.userId] || '';
                bValue = maps.usersMap[b.userId] || '';
            } else if (sortConfig.key === 'cantiereId') {
                aValue = maps.cantieriMap[a.cantiereId] || '';
                bValue = maps.cantieriMap[b.cantiereId] || '';
            } else if (sortConfig.key === 'companyID') {
                aValue = maps.companyMap[a.companyID] || '';
                bValue = maps.companyMap[b.companyID] || '';
            } else if (sortConfig.key === 'data') {
                // Ordina per data/timestamp
                aValue = a.data?.toDate ? a.data.toDate().getTime() : (a.data?.getTime() || 0);
                bValue = b.data?.toDate ? b.data.toDate().getTime() : (b.data?.getTime() || 0);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        return finalSortedItems;
    }, [reports, userAziendaId, searchTerm, dateFilter, sortConfig, maps]);

    return {
        sortedReports: finalSortedItems,
        searchTerm,
        setSearchTerm,
        dateFilter,
        setDateFilter,
        sortConfig,
        requestSort,
        loadingFilters: false // Stato fittizio per coerenza
    };
};