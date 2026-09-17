import { useMemo, useState } from 'react';

export const useScadenziarioManager = (fattureVendita = [], fattureAcquisto = []) => {
    
    const [filtroPeriodo, setFiltroPeriodo] = useState('tutte'); // 'tutte', 'scadute', 'mese_corrente', 'prossimi_30'

    // 1. Unione e Normalizzazione dei Dati
    const scadenze = useMemo(() => {
        const lista = [];

        // A. Elabora Fatture Vendita (ENTRATE)
        fattureVendita.forEach(f => {
            // Escludi le pagate
            if (f.stato === 'Pagata') return;

            const dataScadenza = f.scadenzaPagamento ? new Date(f.scadenzaPagamento) : null;
            
            lista.push({
                id: f.id,
                tipo: 'entrata', // Verde
                controparte: f.ragioneSocialeCliente || f.nomeCliente,
                descrizione: `Fattura N. ${f.numeroFattura}`,
                dataScadenza: dataScadenza,
                importo: f.totaleDocumento || 0,
                stato: f.stato,
                originalRef: f // Riferimento all'oggetto originale se serve
            });
        });

        // B. Elabora Fatture Acquisto (USCITE)
        fattureAcquisto.forEach(f => {
            // Escludi le pagate
            if (f.stato === 'pagata') return; // Nota: minuscolo come da tuo codice precedente

            const dataScadenza = f.dataScadenza ? new Date(f.dataScadenza) : null;

            lista.push({
                id: f.id,
                tipo: 'uscita', // Rossa
                controparte: f.nomeFornitore || 'Fornitore',
                descrizione: `Fatt. Acquisto N. ${f.numeroFattura}`,
                dataScadenza: dataScadenza,
                importo: f.totale || 0, // Nota: 'totale' vs 'totaleDocumento'
                stato: f.stato === 'da_pagare' ? 'Da Pagare' : f.stato,
                originalRef: f
            });
        });

        // C. Ordinamento per Data (dalla più vecchia/scaduta alla più lontana)
        return lista.sort((a, b) => {
            if (!a.dataScadenza) return 1;
            if (!b.dataScadenza) return -1;
            return a.dataScadenza - b.dataScadenza;
        });
    }, [fattureVendita, fattureAcquisto]);

    // 2. Filtraggio
    const scadenzeFiltrate = useMemo(() => {
        const oggi = new Date();
        oggi.setHours(0,0,0,0);

        return scadenze.filter(item => {
            if (!item.dataScadenza) return true; // Mostra sempre le senza data (per sicurezza)

            const scadenza = new Date(item.dataScadenza);
            scadenza.setHours(0,0,0,0);

            switch (filtroPeriodo) {
                case 'scadute':
                    return scadenza < oggi;
                case 'mese_corrente':
                    return scadenza.getMonth() === oggi.getMonth() && scadenza.getFullYear() === oggi.getFullYear();
                case 'prossimi_30':
                    const tra30gg = new Date(oggi);
                    tra30gg.setDate(tra30gg.getDate() + 30);
                    return scadenza >= oggi && scadenza <= tra30gg;
                case 'tutte':
                default:
                    return true;
            }
        });
    }, [scadenze, filtroPeriodo]);

    // 3. Calcolo Totali (sulla vista filtrata)
    const totali = useMemo(() => {
        return scadenzeFiltrate.reduce((acc, item) => {
            if (item.tipo === 'entrata') {
                acc.entrate += item.importo;
                acc.saldo += item.importo;
            } else {
                acc.uscite += item.importo;
                acc.saldo -= item.importo;
            }
            return acc;
        }, { entrate: 0, uscite: 0, saldo: 0 });
    }, [scadenzeFiltrate]);

    return {
        scadenze: scadenzeFiltrate,
        totali,
        filtroPeriodo,
        setFiltroPeriodo
    };
};