
import type { DailyResult, DrawType, HistoryResult, BallColor } from '../types';

// --- CONSTANTES DE PROGRAMACIÓN ---

const DRAW_SCHEDULE = {
  mediodia: { hour: 12, minute: 55, label: 'MEDIODÍA' },
  tarde: { hour: 16, minute: 30, label: 'TARDE' },
  noche: { hour: 19, minute: 30, label: 'NOCHE' }
};

// --- CONFIGURACIÓN DE RED (PROXIES Y FUENTES) ---

// Lista de Proxies rotativos para evasión de CORS
const PROXIES = [
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
];

interface SourceConfig {
    id: string;
    name: string;
    url: string;
    type: 'official' | 'aggregator' | 'media';
    parser: (html: string, dateStr: string) => Partial<Record<DrawType, CandidateResult>>;
}

interface CandidateResult {
    number: string;
    reventados: string | null;
    ball: BallColor | null;
    sourceId: string;
}

// --- UTILIDADES DE PARSEO ---

const normalizeDate = (dateStr: string): string => {
    try {
        // Intenta parsear fechas relativas o formatos sucios
        const clean = dateStr.trim().replace(/-/g, '/');
        const now = new Date();
        
        // Detectar "Hoy"
        if (clean.toLowerCase().includes('hoy')) {
            return now.toLocaleDateString();
        }

        if (clean.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [d, m, y] = clean.split('/');
            return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString();
        }
        return new Date(clean).toLocaleDateString();
    } catch (e) {
        return new Date().toLocaleDateString(); // Fallback a hoy si falla
    }
};

const cleanNumber = (str: string): string | null => {
    const match = str.match(/\d+/);
    if (!match) return null;
    return match[0].padStart(2, '0');
};

// --- MOTORES DE EXTRACCIÓN (PARSERS ESPECÍFICOS) ---

// 1. JPS Oficial
const parseJPS = (html: string, targetDate: string): Partial<Record<DrawType, CandidateResult>> => {
    const results: Partial<Record<DrawType, CandidateResult>> = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('table tbody tr'));

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            const dateText = normalizeDate(cells[0]?.textContent || '');
            if (dateText === targetDate) {
                const drawName = cells[1]?.textContent?.toLowerCase() || '';
                const num = cleanNumber(cells[2]?.textContent || '');
                const revText = cells[3]?.textContent?.toLowerCase() || '';
                
                if (num) {
                    let draw: DrawType | null = null;
                    if (drawName.includes('mediod')) draw = 'mediodia';
                    else if (drawName.includes('tarde')) draw = 'tarde';
                    else if (drawName.includes('noche')) draw = 'noche';

                    if (draw) {
                        const isRed = revText.includes('roja');
                        const revNumMatch = revText.match(/(\d{1,2})x?/);
                        results[draw] = {
                            number: num,
                            reventados: isRed ? (revNumMatch ? cleanNumber(revNumMatch[1]) : num) : null,
                            ball: isRed ? 'roja' : 'blanca',
                            sourceId: 'JPS Oficial'
                        };
                    }
                }
            }
        }
    });
    return results;
};

// 2. LaraTica (Agregador estructurado)
const parseLaraTica = (html: string, targetDate: string): Partial<Record<DrawType, CandidateResult>> => {
    const results: Partial<Record<DrawType, CandidateResult>> = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('tr'));

    rows.forEach(row => {
        const text = row.textContent?.toLowerCase() || '';
        const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
            const date = normalizeDate(dateMatch[0]);
            if (date === targetDate) {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, idx) => {
                   if (idx > 0) {
                       let draw: DrawType | null = null;
                       if (idx === 1) draw = 'mediodia';
                       if (idx === 2) draw = 'tarde';
                       if (idx === 3) draw = 'noche';

                       const cellText = cell.textContent || '';
                       const num = cleanNumber(cellText);
                       if (draw && num) {
                           const isRed = cellText.toLowerCase().includes('roja') || cellText.includes('R');
                           results[draw] = {
                               number: num,
                               reventados: isRed ? num : null,
                               ball: isRed ? 'roja' : 'blanca',
                               sourceId: 'LaraTica'
                           };
                       }
                   }
                });
            }
        }
    });
    return results;
};

// 3. Parser Genérico de Noticias (La Teja, Teletica, Repretel)
// Busca patrones como "Mediodía: 45" o "Sorteo Tarde ... el número 88"
const parseNewsGeneric = (html: string, sourceName: string): Partial<Record<DrawType, CandidateResult>> => {
    const results: Partial<Record<DrawType, CandidateResult>> = {};
    // Limpiamos HTML tags para buscar en texto plano
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    
    // Patrones Regex robustos para encontrar resultados en texto periodístico
    const patterns = [
        { type: 'mediodia' as DrawType, regex: /(?:mediod[ií]a|12:55|doce).*?número.*?(\d{2})/i },
        { type: 'tarde' as DrawType, regex: /(?:tarde|4:30|cuatro).*?número.*?(\d{2})/i },
        { type: 'noche' as DrawType, regex: /(?:noche|7:30|siete).*?número.*?(\d{2})/i }
    ];

    patterns.forEach(p => {
        // Buscamos coincidencias cercanas a palabras clave de lotería
        // Limitamos el contexto para evitar falsos positivos de otras fechas
        const contextRegex = new RegExp(`nuevos tiempos.*?${p.regex.source}`, 'i');
        const match = textContent.match(contextRegex) || textContent.match(p.regex);
        
        if (match && match[1]) {
            const num = cleanNumber(match[1]);
            if (num) {
                results[p.type] = {
                    number: num,
                    reventados: null, // Difícil de extraer confiablemente de texto libre
                    ball: 'blanca', // Default conservador
                    sourceId: sourceName
                };
            }
        }
    });
    return results;
};

// --- DEFINICIÓN DE FUENTES ---

const SOURCES: SourceConfig[] = [
    { 
        id: 'jps', 
        name: 'JPS Oficial', 
        url: 'https://www.jps.go.cr/resultados/nuevos-tiempos-reventados', 
        type: 'official', 
        parser: parseJPS 
    },
    { 
        id: 'laratica', 
        name: 'LaraTica', 
        url: 'https://laratica.com/nuevos-tiempos.html', 
        type: 'aggregator', 
        parser: parseLaraTica 
    },
    { 
        id: 'lateja', 
        name: 'La Teja', 
        url: 'https://www.lateja.cr/loterias/', 
        type: 'media', 
        parser: (html) => parseNewsGeneric(html, 'La Teja') 
    },
    { 
        id: 'teletica', 
        name: 'Teletica', 
        url: 'https://www.teletica.com/loterias', 
        type: 'media', 
        parser: (html) => parseNewsGeneric(html, 'Teletica') 
    }
];

// --- MOTOR DE CONSENSO ---

const fetchSourceData = async (source: SourceConfig, dateStr: string): Promise<Partial<Record<DrawType, CandidateResult>>> => {
    // Intentar proxies en orden
    for (const proxy of PROXIES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout por proxy

            const response = await fetch(proxy(source.url), { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const html = data.contents || data; // Adaptador para diferentes proxies
                if (typeof html === 'string') {
                    return source.parser(html, dateStr);
                }
            }
        } catch (e) {
            // Fallo silencioso, intentar siguiente proxy
        }
    }
    return {};
};

const executeConsensus = async (dateStr: string): Promise<Record<DrawType, CandidateResult | null>> => {
    console.log(`[CONSENSUS ENGINE] Iniciando validación para fecha: ${dateStr}`);
    
    // 1. Ejecutar fetch en paralelo para todas las fuentes
    const promises = SOURCES.map(source => fetchSourceData(source, dateStr));
    const resultsArray = await Promise.all(promises);

    const finalResults: Record<DrawType, CandidateResult | null> = {
        mediodia: null,
        tarde: null,
        noche: null
    };

    // 2. Algoritmo de Votación por Sorteo
    (['mediodia', 'tarde', 'noche'] as DrawType[]).forEach(draw => {
        const candidates: CandidateResult[] = [];
        
        // Recolectar candidatos
        resultsArray.forEach(sourceResult => {
            if (sourceResult[draw]) {
                candidates.push(sourceResult[draw]!);
            }
        });

        // Agrupar por número ganador
        const votes: Record<string, { count: number, sources: string[], sample: CandidateResult }> = {};
        
        candidates.forEach(c => {
            if (!votes[c.number]) {
                votes[c.number] = { count: 0, sources: [], sample: c };
            }
            votes[c.number].count++;
            votes[c.number].sources.push(c.sourceId);
        });

        // 3. Regla de Validación Estricta (Triangulación)
        // Se requiere coincidencia en al menos 3 fuentes
        let verifiedResult: CandidateResult | null = null;
        
        Object.entries(votes).forEach(([num, data]) => {
            if (data.count >= 3) {
                console.log(`[VERIFIED] Sorteo ${draw.toUpperCase()}: Número ${num} confirmado por 3+ fuentes: ${data.sources.join(', ')}`);
                // Priorizar datos completos (con reventados) si existen en alguna fuente confiable
                const bestSample = candidates.find(c => c.number === num && c.reventados !== null) || data.sample;
                verifiedResult = bestSample;
            } else {
                console.log(`[PENDING] Sorteo ${draw.toUpperCase()}: Número ${num} tiene solo ${data.count} confirmaciones (${data.sources.join(', ')}). Se requieren 3.`);
            }
        });

        finalResults[draw] = verifiedResult;
    });

    return finalResults;
};

// --- CÁLCULO VISUAL (FALLBACK) ---

export const getNextDrawLabel = (): string => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const mediodiaTime = DRAW_SCHEDULE.mediodia.hour * 60 + DRAW_SCHEDULE.mediodia.minute;
    const tardeTime = DRAW_SCHEDULE.tarde.hour * 60 + DRAW_SCHEDULE.tarde.minute;
    const nocheTime = DRAW_SCHEDULE.noche.hour * 60 + DRAW_SCHEDULE.noche.minute;

    if (currentMinutes < mediodiaTime) return `MEDIODÍA (12:55 PM)`;
    if (currentMinutes < tardeTime) return `TARDE (4:30 PM)`;
    if (currentMinutes < nocheTime) return `NOCHE (7:30 PM)`;
    return "Próximo: Mañana 12:55 PM";
};

// Nuevo cálculo preciso para la cuenta regresiva
export const getNextDrawTarget = (): Date => {
    const now = new Date();
    const today = new Date(); // Clona fecha base
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Definir los momentos de sorteo de HOY
    const drawsToday = [
        { ...DRAW_SCHEDULE.mediodia, date: new Date(today.setHours(DRAW_SCHEDULE.mediodia.hour, DRAW_SCHEDULE.mediodia.minute)) },
        { ...DRAW_SCHEDULE.tarde, date: new Date(today.setHours(DRAW_SCHEDULE.tarde.hour, DRAW_SCHEDULE.tarde.minute)) },
        { ...DRAW_SCHEDULE.noche, date: new Date(today.setHours(DRAW_SCHEDULE.noche.hour, DRAW_SCHEDULE.noche.minute)) }
    ];

    // Buscar el primer sorteo que sea MAYOR que 'now'
    const nextDraw = drawsToday.find(d => d.date > now);

    if (nextDraw) {
        return nextDraw.date;
    } else {
        // Si ya pasaron todos los de hoy, el próximo es mañana a mediodía
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(DRAW_SCHEDULE.mediodia.hour, DRAW_SCHEDULE.mediodia.minute, 0, 0);
        return tomorrow;
    }
};

// --- FUNCIÓN PRINCIPAL EXPORTADA ---

export const fetchOfficialData = async (): Promise<{today: DailyResult[], history: HistoryResult[], nextDraw: string, nextDrawTarget: Date}> => {
    const todayStr = normalizeDate(new Date().toLocaleDateString());
    const nextDraw = getNextDrawLabel();
    const nextDrawTarget = getNextDrawTarget(); // Obtenemos el objeto fecha real

    // 1. Ejecutar Consenso
    const consensusToday = await executeConsensus(todayStr);
    
    // 2. Mapear resultados verificados al formato de la UI
    const todayResults: DailyResult[] = [
        { 
            date: todayStr, 
            draw: 'mediodia', 
            number: consensusToday.mediodia?.number || null, 
            reventadosNumber: consensusToday.mediodia?.reventados || null, 
            ballColor: consensusToday.mediodia?.ball || null 
        },
        { 
            date: todayStr, 
            draw: 'tarde', 
            number: consensusToday.tarde?.number || null, 
            reventadosNumber: consensusToday.tarde?.reventados || null, 
            ballColor: consensusToday.tarde?.ball || null 
        },
        { 
            date: todayStr, 
            draw: 'noche', 
            number: consensusToday.noche?.number || null, 
            reventadosNumber: consensusToday.noche?.reventados || null, 
            ballColor: consensusToday.noche?.ball || null 
        }
    ];

    // 3. Obtener historial
    const historySource = SOURCES.find(s => s.id === 'jps')!;
    const rawHistory = await fetchSourceData(historySource, 'HISTORIC_MODE'); 
    
    return {
        today: todayResults,
        history: [],
        nextDraw,
        nextDrawTarget // Retornamos la fecha objetivo
    };
};
