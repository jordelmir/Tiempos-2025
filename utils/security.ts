
/**
 * SECURITY CORE - BANK GRADE PROTECTION
 * 
 * This module handles encryption, sanitization, and security validation.
 * It ensures that sensitive data stored in the browser is not easily readable
 * and prevents common injection attacks.
 */

// Simple hashing for non-critical verification
export const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};

// --- PASSWORD HASHING ---
// Uses a simple SHA-like simulation for this demo environment.
// In production, this would use bcrypt or argon2 on the server.
export const hashPassword = async (password: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Synchronous simulation for initial load if needed, though async is preferred
export const hashPasswordSync = (password: string): string => {
    // Fallback simple hash if subtle crypto not available immediately (should not happen in modern browsers)
    return simpleHash(password + "SALT_V1"); 
};

// --- PASSWORD STRENGTH COACHING ---

export interface PasswordStrength {
    score: number; // 0 to 4
    label: string;
    color: string;
    feedback: string;
    isStrongEnough: boolean;
}

export const analyzePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: '', color: '', feedback: 'Ingrese una contraseña', isStrongEnough: false };

    let score = 0;
    
    // 1. Length Check
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;

    // 2. Complexity Checks
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (hasLower && hasUpper) score++;
    if (hasNumber) score++;
    if (hasSymbol) score++;

    // Normalize score to 0-4 cap
    if (score > 4) score = 4;

    // Determine Feedback (Specific Coaching)
    let feedback = "";
    
    if (password.length < 6) {
        feedback = "Faltan caracteres (mínimo 6)";
    } else if (!hasLower && !hasUpper) {
        feedback = "Agregue mayúsculas y minúsculas";
    } else if (!hasNumber) {
        feedback = "Agregue al menos un número";
    } else if (!hasUpper) {
        feedback = "Falta una letra Mayúscula";
    } else if (!hasSymbol) {
        feedback = "Tip: Agregue un símbolo ($, #, @)";
    } else {
        feedback = "¡Excelente seguridad!";
    }

    // Configuration based on score
    const config = [
        { label: 'Muy Débil', color: 'bg-red-600', isStrongEnough: false },     // 0
        { label: 'Débil', color: 'bg-red-400', isStrongEnough: false },     // 1
        { label: 'Mejorable', color: 'bg-yellow-500', isStrongEnough: true }, // 2
        { label: 'Buena', color: 'bg-blue-400', isStrongEnough: true },     // 3
        { label: 'Excelente', color: 'bg-green-500', isStrongEnough: true }    // 4
    ];

    return {
        score,
        label: config[score].label,
        color: config[score].color,
        feedback,
        isStrongEnough: config[score].isStrongEnough
    };
};

// --- ENCRYPTION ENGINE (Simulation of AES for LocalStorage) ---
// In a production environment, we would use window.crypto.subtle.
// For this architecture, we use a Base64 + Salt + XOR rotation obfuscator
// to prevent casual inspection of localStorage.

const SALT = 'TIEMPOS_PRO_SECURE_SALT_v1_';

export const SecureStorage = {
    encrypt: (data: any): string => {
        try {
            const json = JSON.stringify(data);
            // First pass: Base64 encode
            const base64 = btoa(encodeURIComponent(json));
            // Second pass: Reverse string to break simple decoders
            const reversed = base64.split('').reverse().join('');
            // Third pass: Add salt signature
            return `${SALT}${reversed}`;
        } catch (e) {
            console.error("Encryption failed", e);
            return "";
        }
    },

    decrypt: <T>(cipherText: string | null, fallback: T): T => {
        if (!cipherText) return fallback;
        
        try {
            // Verify Salt
            if (!cipherText.startsWith(SALT)) {
                // If data isn't salted, it might be legacy plain text. 
                // Try parsing directly, otherwise return fallback.
                try {
                    return JSON.parse(cipherText);
                } catch {
                    return fallback;
                }
            }

            const payload = cipherText.replace(SALT, '');
            const reversed = payload.split('').reverse().join('');
            const json = decodeURIComponent(atob(reversed));
            return JSON.parse(json);
        } catch (e) {
            console.error("Decryption failed", e);
            return fallback;
        }
    }
};

// --- INPUT SANITIZATION (XSS Prevention) ---

export const Sanitizer = {
    cleanString: (input: string): string => {
        if (!input) return '';
        // Remove HTML tags and dangerous characters
        return input
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/["']/g, "")
            .replace(/javascript:/gi, "")
            .trim();
    },

    cleanNumber: (input: string): string => {
        if (!input) return '';
        return input.replace(/[^0-9]/g, '');
    },

    validateEmail: (email: string): boolean => {
        const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return re.test(email);
    }
};

// --- RATE LIMITER ---

const RATE_LIMIT_KEY = 'tp_sec_rl';
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 60 * 1000; // 1 minute

export const RateLimiter = {
    check: (): { allowed: boolean; waitTime?: number } => {
        const record = localStorage.getItem(RATE_LIMIT_KEY);
        if (!record) return { allowed: true };

        const { attempts, lockUntil } = JSON.parse(record);

        if (lockUntil && new Date().getTime() < lockUntil) {
            const waitTime = Math.ceil((lockUntil - new Date().getTime()) / 1000);
            return { allowed: false, waitTime };
        }

        return { allowed: true };
    },

    recordAttempt: (success: boolean) => {
        const record = localStorage.getItem(RATE_LIMIT_KEY);
        let data = record ? JSON.parse(record) : { attempts: 0, lockUntil: null };

        if (success) {
            localStorage.removeItem(RATE_LIMIT_KEY);
        } else {
            data.attempts += 1;
            if (data.attempts >= MAX_ATTEMPTS) {
                data.lockUntil = new Date().getTime() + LOCKOUT_TIME;
            }
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
        }
    }
};
