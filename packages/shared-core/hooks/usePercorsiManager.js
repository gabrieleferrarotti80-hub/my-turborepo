import { useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

export const usePercorsiManager = (db, userAziendaId) => {
    const [percorsi, setPercorsi] = useState([]);
    const [loading, setLoading] = useState(false);

    const getRandomColor = () => {
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const fetchPercorsi = async (userId, startDate, endDate, cantiereId = null) => {
        
        // Controllo di sicurezza
        if ((!userId && !cantiereId) || !startDate || !endDate) {
            return;
        }

        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const startTS = Timestamp.fromDate(start);
            const endTS = Timestamp.fromDate(end);

            const constraints = [
                where('companyID', '==', userAziendaId),
                where('createdAt', '>=', startTS),
                where('createdAt', '<=', endTS)
            ];

            if (userId) constraints.push(where('userId', '==', userId));
            if (cantiereId) constraints.push(where('cantiereId', '==', cantiereId));

            constraints.push(orderBy('createdAt', 'asc'));

            const q = query(reportsRef, ...constraints);
            const querySnapshot = await getDocs(q);
            
            console.log(`📊 Query (User: ${userId}, Site: ${cantiereId}): ${querySnapshot.size} report.`);

            if (querySnapshot.empty) {
                setPercorsi([]);
                return;
            }

            const rawReports = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Raggruppamento
            const percorsiElaborati = rawReports.reduce((acc, report) => {
                const dateStr = report.createdAt?.toDate 
                    ? report.createdAt.toDate().toLocaleDateString('it-IT') 
                    : new Date(report.createdAt).toLocaleDateString('it-IT');
                
                if (!acc[dateStr]) {
                    acc[dateStr] = {
                        date: dateStr,
                        color: getRandomColor(),
                        points: []
                    };
                }

               if (report.location?.latitude && report.location?.longitude) {
                    acc[dateStr].points.push({
                        lat: report.location.latitude,
                        lng: report.location.longitude,
                        info: `${report.tipologia} - Ore ${report.createdAt.toDate().toLocaleTimeString('it-IT')}`,
                        img: report.fileUrl || null,
                        
                        // ✅ AGGIUNTO: Salviamo l'ID dell'operatore
                        userId: report.userId || report.autoreId || 'N/A' 
                    });
                }
                return acc;
            }, {});

            const finalData = Object.values(percorsiElaborati).map(giorno => {
                const segments = [];
                for (let i = 0; i < giorno.points.length - 1; i++) {
                    segments.push({
                        start: giorno.points[i],
                        end: giorno.points[i+1],
                        info: giorno.points[i].info
                    });
                }
                return { ...giorno, segments };
            });

            setPercorsi(finalData);
        } catch (error) {
            console.error("Errore recupero percorsi:", error);
        } finally {
            setLoading(false);
        }
    };

    return { percorsi, loading, fetchPercorsi };
};