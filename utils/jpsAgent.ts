
import type { DailyResult, DrawType, HistoryResult, BallColor } from '../types';

// Constants for draw times
const DRAW_SCHEDULE = {
  mediodia: { hour: 12, minute: 55 },
  tarde: { hour: 16, minute: 30 },
  noche: { hour: 19, minute: 30 }
};

/**
 * Pseudo-random number generator seeded by date string.
 * Ensures consistent numbers for specific dates without storing them.
 */
const getSeededNumber = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const absHash = Math.abs(hash);
  const number = absHash % 100;
  return number.toString().padStart(2, '0');
};

/**
 * Determines the ball color (Reventados) deterministically.
 * Simulates approx 20% chance of Red ball.
 */
const getBallColor = (seed: string): BallColor => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const absHash = Math.abs(hash);
    // If mod 100 is less than 20, it's a Red ball (Roja)
    return (absHash % 100) < 20 ? 'roja' : 'blanca';
};

/**
 * Calculates the current state of the daily draw based on system time.
 */
export const getTodayResults = (): { results: DailyResult[], nextDraw: string } => {
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const mediodiaTime = DRAW_SCHEDULE.mediodia.hour * 60 + DRAW_SCHEDULE.mediodia.minute;
  const tardeTime = DRAW_SCHEDULE.tarde.hour * 60 + DRAW_SCHEDULE.tarde.minute;
  const nocheTime = DRAW_SCHEDULE.noche.hour * 60 + DRAW_SCHEDULE.noche.minute;

  // Flags to check if draw has passed (adding 5 min delay for "processing")
  const isMediodiaPlayed = currentMinutes >= (mediodiaTime + 5);
  const isTardePlayed = currentMinutes >= (tardeTime + 5);
  const isNochePlayed = currentMinutes >= (nocheTime + 5);

  // --- GENERATION LOGIC ---
  
  const mediodiaBall = isMediodiaPlayed ? getBallColor(`${todayStr}-mediodia-ball`) : null;
  const mediodiaRevNum = (isMediodiaPlayed && mediodiaBall === 'roja') ? getSeededNumber(`${todayStr}-mediodia-rev`) : null;

  const tardeBall = isTardePlayed ? getBallColor(`${todayStr}-tarde-ball`) : null;
  const tardeRevNum = (isTardePlayed && tardeBall === 'roja') ? getSeededNumber(`${todayStr}-tarde-rev`) : null;

  const nocheBall = isNochePlayed ? getBallColor(`${todayStr}-noche-ball`) : null;
  const nocheRevNum = (isNochePlayed && nocheBall === 'roja') ? getSeededNumber(`${todayStr}-noche-rev`) : null;

  // Determine revealed numbers based on time
  const results: DailyResult[] = [
    {
      date: todayStr,
      draw: 'mediodia',
      number: isMediodiaPlayed ? getSeededNumber(`${todayStr}-mediodia`) : null,
      reventadosNumber: mediodiaRevNum, 
      ballColor: mediodiaBall
    },
    {
      date: todayStr,
      draw: 'tarde',
      number: isTardePlayed ? getSeededNumber(`${todayStr}-tarde`) : null,
      reventadosNumber: tardeRevNum,
      ballColor: tardeBall
    },
    {
      date: todayStr,
      draw: 'noche',
      number: isNochePlayed ? getSeededNumber(`${todayStr}-noche`) : null,
      reventadosNumber: nocheRevNum,
      ballColor: nocheBall
    }
  ];

  // Determine next draw label
  let nextDraw = "Sorteos finalizados";
  if (currentMinutes < mediodiaTime) {
    const diff = mediodiaTime - currentMinutes;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    nextDraw = `MEDIODÍA en ${hrs}h ${mins}m`;
  } else if (currentMinutes < tardeTime) {
    const diff = tardeTime - currentMinutes;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    nextDraw = `TARDE en ${hrs}h ${mins}m`;
  } else if (currentMinutes < nocheTime) {
    const diff = nocheTime - currentMinutes;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    nextDraw = `NOCHE en ${hrs}h ${mins}m`;
  } else {
      nextDraw = "MEDIODÍA 12:55 PM";
  }

  return { results, nextDraw };
};

/**
 * Generates history for the last 7 days
 */
export const getSevenDayHistory = (): HistoryResult[] => {
    const history: HistoryResult[] = [];
    
    // Start from yesterday
    for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        
        // Generate Balls first to determine if Reventados Number exists
        const mBall = getBallColor(`${dateStr}-mediodia-ball`);
        const tBall = getBallColor(`${dateStr}-tarde-ball`);
        const nBall = getBallColor(`${dateStr}-noche-ball`);

        history.push({
            date: dateStr,
            results: {
                mediodia: { 
                    number: getSeededNumber(`${dateStr}-mediodia`),
                    reventadosNumber: mBall === 'roja' ? getSeededNumber(`${dateStr}-mediodia-rev`) : '', // Empty string if not red
                    ball: mBall
                },
                tarde: { 
                    number: getSeededNumber(`${dateStr}-tarde`),
                    reventadosNumber: tBall === 'roja' ? getSeededNumber(`${dateStr}-tarde-rev`) : '',
                    ball: tBall
                },
                noche: { 
                    number: getSeededNumber(`${dateStr}-noche`),
                    reventadosNumber: nBall === 'roja' ? getSeededNumber(`${dateStr}-noche-rev`) : '',
                    ball: nBall
                }
            }
        });
    }
    
    return history;
};

// Simulate an async fetch to an external API (like JPS via proxy)
export const fetchOfficialData = async (): Promise<{today: DailyResult[], history: HistoryResult[], nextDraw: string}> => {
    // In a real scenario, this would use fetch() to a CORS proxy
    // For this demo, we simulate the "Agent" verifying data
    return new Promise((resolve) => {
        setTimeout(() => {
            const todayData = getTodayResults();
            const historyData = getSevenDayHistory();
            resolve({
                today: todayData.results,
                history: historyData,
                nextDraw: todayData.nextDraw
            });
        }, 1500); // 1.5s delay to simulate network request
    });
};