import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Stili per il PDF (simile a una lettera formale)
const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1 solid #ccc', paddingBottom: 10 },
    logo: { width: 60, height: 60, objectFit: 'contain' },
    companyInfo: { width: '70%', fontSize: 9, color: '#555' },
    title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, textTransform: 'uppercase' },
    section: { marginBottom: 15 },
    label: { fontSize: 10, color: '#666', marginBottom: 2 },
    value: { fontSize: 11, fontWeight: 'bold' },
    textBlock: { marginBottom: 10, textAlign: 'justify' },
    signatureArea: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    signatureBox: { width: '45%', borderTop: '1 solid #000', paddingTop: 5, alignItems: 'center', minHeight: 100 }, // ✅ minHeight per uniformità
    signatureImage: { width: 120, height: 50, objectFit: 'contain', marginVertical: 5 }, // ✅ Dimensioni ottimizzate
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#aaa', textAlign: 'center' }
});

// Helper date
const formatDate = (d) => {
    if (!d) return '___/___/______';
    const dateObj = d.toDate ? d.toDate() : new Date(d);
    return dateObj.toLocaleDateString('it-IT');
};

export const VerbaleConsegnaDPI = ({ data, azienda }) => {
    const nomeAzienda = azienda?.ragioneSociale || azienda?.companyName || 'Azienda';
    
    // ✅ Logica per recuperare la firma del consegnatario
    // Può arrivare come firmaConsegnatarioUrl se passata esplicitamente o cercata nei dati
    const firmaConsegnatario = data.consegnatarioFirmaUrl || data.creatoDa_FirmaUrl;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                
                {/* --- INTESTAZIONE AZIENDA --- */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000' }}>{nomeAzienda}</Text>
                        <Text>{azienda?.indirizzo || ''}</Text>
                        <Text>{azienda?.citta || ''} - P.IVA: {azienda?.piva || ''}</Text>
                        <Text>Email: {azienda?.email || ''}</Text>
                    </View>
                    {azienda?.logoUrl && <Image src={azienda.logoUrl} style={styles.logo} />}
                </View>

                {/* --- TITOLO --- */}
                <Text style={styles.title}>Verbale di Consegna DPI</Text>

                {/* --- DATI --- */}
                <View style={styles.section}>
                    <Text style={styles.textBlock}>
                        Il sottoscritto lavoratore <Text style={{ fontWeight: 'bold' }}>{data.assegnatoA_Nome}</Text>,
                        dipendente della ditta {nomeAzienda}, dichiara di ricevere in dotazione personale il seguente Dispositivo di Protezione Individuale:
                    </Text>
                </View>

                <View style={[styles.section, { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4 }]}>
                    <Text style={styles.label}>Articolo / DPI:</Text>
                    <Text style={styles.value}>{data.articoloNome || data.attrezzaturaNome}</Text>
                    
                    {data.articoloSeriale && (
                        <>
                            <Text style={[styles.label, { marginTop: 5 }]}>Matricola / Seriale / Taglia:</Text>
                            <Text style={styles.value}>{data.articoloSeriale}</Text>
                        </>
                    )}
                    
                    <Text style={[styles.label, { marginTop: 5 }]}>Data di Consegna:</Text>
                    <Text style={styles.value}>{formatDate(data.dataAssegnazione)}</Text>
                </View>

                {/* --- DICHIARAZIONI LEGAL --- */}
                <View style={styles.section}>
                    <Text style={{ fontSize: 10, color: '#333', marginBottom: 5, fontWeight: 'bold' }}>Dichiarazione del Lavoratore:</Text>
                    <Text style={styles.textBlock}>
                        1. Dichiaro che il DPI ricevuto è idoneo alla mia mansione e della misura corretta.
                    </Text>
                    <Text style={styles.textBlock}>
                        2. Dichiaro di essere stato informato/formato sul corretto utilizzo, manutenzione e conservazione dello stesso, in conformità al D.Lgs 81/08.
                    </Text>
                    <Text style={styles.textBlock}>
                        3. Mi impegno a utilizzare il DPI durante le lavorazioni che lo richiedono, a non manometterlo e a segnalare tempestivamente eventuali difetti o usure al Preposto.
                    </Text>
                </View>

                {/* --- FIRME --- */}
                <View style={styles.signatureArea}>
                    {/* ✅ Firma del Consegnatario (Azienda) */}
                    <View style={styles.signatureBox}>
                        <Text style={{ fontSize: 9, marginBottom: 5 }}>Il Consegnatario (Azienda)</Text>
                        {firmaConsegnatario ? (
                            <Image src={firmaConsegnatario} style={styles.signatureImage} />
                        ) : (
                            <View style={{ height: 50 }} /> // Spazio vuoto se manca
                        )}
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{data.creatoDa_Nome || 'Ufficio Tecnico'}</Text>
                    </View>

                    {/* Firma del Lavoratore */}
                    <View style={styles.signatureBox}>
                        <Text style={{ fontSize: 9, marginBottom: 5 }}>Il Lavoratore (Per Ricevuta)</Text>
                        {data.firmaUrl ? (
                            <Image src={data.firmaUrl} style={styles.signatureImage} />
                        ) : (
                            <Text style={{ marginTop: 20, color: 'red', fontSize: 8 }}>Firma in attesa...</Text>
                        )}
                        <Text style={{ fontSize: 8, marginTop: 2 }}>{data.assegnatoA_Nome}</Text>
                        <Text style={{ fontSize: 7, color: '#666' }}>Firmato digitalmente il {formatDate(data.dataConferma)}</Text>
                    </View>
                </View>

                {/* --- FOOTER --- */}
                <Text style={styles.footer}>
                    Documento generato digitalmente da sistema gestionale - ID Transazione: {data.id}
                </Text>

            </Page>
        </Document>
    );
};