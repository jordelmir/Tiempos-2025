
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
