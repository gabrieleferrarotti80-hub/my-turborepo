import { useMemo } from 'react';

export const useCantiereReportGenerator = (cantieri, assegnazioniCantieri, reports, reportTecnico, users, attrezzature) => {

    const generateFullReport = useMemo(() => {
        // Aggiungiamo controlli di sicurezza per evitare crash se i dati non sono ancora pronti
        if (!cantieri?.length || !reports || !reportTecnico || !assegnazioniCantieri || !users) {
            return [];
        }

        const userMap = new Map((users || []).map(u => [u.id, u]));

        return cantieri.map(cantiere => {
            // ✅ CORREZIONE CHIAVE: Filtriamo i report per assicurarci che abbiano una data valida
            const reportsDelCantiere = reports.filter(r => 
                r.cantiereId === cantiere.id && r.createdAt instanceof Date
            );
            
            // Il resto della logica ora è sicura perché sa che 'r.createdAt' esisterà sempre
            const ispezioniDelCantiere = reportTecnico.filter(rt => rt.cantiereId === cantiere.id);
            const assegnazioniDelCantiere = assegnazioniCantieri.filter(ac => ac.cantiereId === cantiere.id);

            const dateInizio = reportsDelCantiere
                .filter(r => r.tipologia === 'Inizio Lavoro')
                .map(r => r.createdAt);
            
            const dateFine = reportsDelCantiere
                .filter(r => r.chiusuraLavori === true)
                .map(r => r.createdAt);

            const dataInizio = dateInizio.length > 0 ? new Date(Math.min(...dateInizio)) : null;
            const dataFine = dateFine.length > 0 ? new Date(Math.max(...dateFine)) : null;

            const uominiImpiegati = new Set();
            assegnazioniDelCantiere.forEach(ass => {
                if (ass.prepostoId) uominiImpiegati.add(ass.prepostoId);
                ass.operaiIds?.forEach(id => uominiImpiegati.add(id));
            });
            
            const giornateLavorate = [...new Set(reportsDelCantiere.map(r => r.createdAt.toDateString()))];

            return {
                id: cantiere.id,
                nomeCantiere: cantiere.nomeCantiere,
                
                // Livello 1: Overview
                dataInizio,
                dataFine,
                totaleGiorniLavorati: giornateLavorate.length,
                totaleUomini: uominiImpiegati.size,
                totaleIspezioni: ispezioniDelCantiere.length,
                
                // Livello 2: Dettagli
                dettaglioGiornate: giornateLavorate.map(giornoString => {
                    const personalePresente = new Set();
                    reportsDelCantiere.forEach(report => {
                        if (report.createdAt.toDateString() === giornoString) {
                            personalePresente.add(report.userId);
                        }
                    });
                    return {
                        giorno: new Date(giornoString),
                        personale: Array.from(personalePresente).map(id => {
                            const user = userMap.get(id);
                            return user ? `${user.nome} ${user.cognome}` : 'Sconosciuto';
                        })
                    };
                }),
                dettaglioPersonale: Array.from(uominiImpiegati).map(id => userMap.get(id)),
                dettaglioIspezioni: ispezioniDelCantiere,
            };
        });
    }, [cantieri, assegnazioniCantieri, reports, reportTecnico, users, attrezzature]);

    const isLoading = !cantieri || !reports || !assegnazioniCantieri || !users || !reportTecnico;

    return { fullReport: generateFullReport, isLoading };
};