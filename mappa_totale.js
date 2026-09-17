const fs = require('fs');
const path = require('path');

// 🔍 CONFIGURAZIONE: Le cartelle chiave del tuo Monorepo
const rootDirs = [
    'packages/shared-core',       // Il cervello (Hooks, Context, Utils)
    'packages/shared-ui',         // I mattoncini (Componenti riutilizzabili)
    'apps/gestionale/src',        // Il sito Admin
    'apps/app-esterna/src'        // L'App per gli operai
];

// Ignora questi file/cartelle per non fare confusione
const ignoreList = ['node_modules', '.git', 'dist', 'build', 'assets', 'styles', '.css', '.svg', '.png', 'setupTests'];

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
    
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!ignoreList.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            // Analizziamo solo file JS e JSX rilevanti
            if ((file.endsWith('.js') || file.endsWith('.jsx')) && !ignoreList.some(x => file.includes(x))) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

function analyzeProject() {
    console.log("🚀 AVVIO ANALISI COMPLETA DEL PROGETTO...\n");
    let report = "";

    rootDirs.forEach(rootDir => {
        report += `\n####################################################\n`;
        report += `📦 AREA: ${rootDir.toUpperCase()}\n`;
        report += `####################################################\n`;

        const files = getAllFiles(rootDir);

        if (files.length === 0) {
            report += `  (Nessun file trovato o percorso errato)\n`;
        }

        files.forEach(filePath => {
            const fileName = path.basename(filePath);
            const relativePath = filePath; 
            
            // Leggi contenuto
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            // 1. Cerca EXPORT (Cosa fa questo file?)
            // Cerchiamo: export const X, export default function X, const X = () =>
            const exports = lines
                .filter(l => l.includes('export const') || l.includes('export default') || (l.includes('const ') && l.includes('=>') && !l.includes('require')))
                .map(l => {
                    let name = l.replace('export const', '').replace('export default function', '').replace('export default', '').split('=')[0].split('(')[0].trim();
                    return name;
                })
                .filter(n => n && n.length > 2 && !n.startsWith('use') && !n.includes('styled')) // Filtra un po' di rumore
                .slice(0, 5); // Max 5 funzioni per brevità

            // Se è un Hook, prendiamo il nome preciso
            if (fileName.startsWith('use')) {
                exports.push(fileName.replace('.js', '').replace('.jsx', ''));
            }

            // 2. Cerca IMPORT RILEVANTI (Da chi dipende?)
            // Ci interessa sapere se usa Firebase, altri Hooks o Componenti UI
            const imports = lines
                .filter(l => l.trim().startsWith('import'))
                .map(l => {
                    // Estrae solo il nome del pacchetto o del file
                    const match = l.match(/from ['"](.*)['"]/);
                    return match ? match[1] : null;
                })
                .filter(i => i && (i.startsWith('.') || i.includes('shared') || i.includes('firebase'))) // Solo import interni o importanti
                .map(i => path.basename(i)); // Tieni solo il nome file per pulizia

            // SCRIVI REPORT SOLO SE IL FILE È SIGNIFICATIVO
            if (exports.length > 0 || imports.length > 0) {
                report += `\n📄 FILE: ${fileName}\n`;
                report += `   📍 Percorso: ${relativePath}\n`;
                
                if (exports.length > 0) {
                    report += `   ⚙️ FUNZIONI/COMPONENTI: ${exports.join(', ')}\n`;
                }
                
                if (imports.length > 0) {
                    // Rimuovi duplicati dagli import
                    const uniqueImports = [...new Set(imports)];
                    report += `   🔗 COLLEGAMENTI: Usa -> [ ${uniqueImports.slice(0, 6).join(', ')}${uniqueImports.length > 6 ? '...' : ''} ]\n`;
                }
                report += `   ------------------------------------------------\n`;
            }
        });
    });

    // Salva su file per leggibilità
    fs.writeFileSync('REPORT_ARCHITETTURA.txt', report);
    console.log(report);
    console.log("\n✅ ANALISI COMPLETATA!");
    console.log("📂 Ho creato un file 'REPORT_ARCHITETTURA.txt' con i dettagli.");
}

analyzeProject();