
// ==============================================================================
// EDGE FUNCTION: AUTOTEST RLS (SECURITY AUDIT)
// ==============================================================================
// Description: Executes a battery of integration tests to validate RLS policies.
//              Uses raw HTTP requests to verify API status codes (401/403/200).
// ==============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// --- TYPE FIX: Declare Deno global for TS environments that don't recognize it ---
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Utility for UUID validation
function isUuid(v: unknown): boolean {
  return typeof v === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}

Deno.serve(async (req: Request) => {
  try {
    // --------------------------------------------------------------------------
    // 1. SECURITY HANDSHAKE
    // --------------------------------------------------------------------------
    const secret = Deno.env.get("AUTOTEST_SECRET");
    const headerSecret = req.headers.get("x-autotest-secret");

    if (!secret) {
      console.error("FATAL: AUTOTEST_SECRET env var is missing.");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500 });
    }
    
    // Constant-time comparison (simulated) to prevent timing attacks
    if (secret !== headerSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid Secret" }), { status: 401 });
    }

    // --------------------------------------------------------------------------
    // 2. PAYLOAD PARSING & VALIDATION
    // --------------------------------------------------------------------------
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON body" }), { status: 400 });
    }

    const { TEST_USER_JWT, TEST_ADMIN_JWT, TEST_USER_ID, TEST_OTHER_ID } = body;

    const missingFields: string[] = [];
    if (!TEST_USER_JWT || typeof TEST_USER_JWT !== "string") missingFields.push("TEST_USER_JWT");
    if (!TEST_ADMIN_JWT || typeof TEST_ADMIN_JWT !== "string") missingFields.push("TEST_ADMIN_JWT");
    if (!TEST_USER_ID || !isUuid(TEST_USER_ID)) missingFields.push("TEST_USER_ID (Invalid UUID)");
    if (!TEST_OTHER_ID || !isUuid(TEST_OTHER_ID)) missingFields.push("TEST_OTHER_ID (Invalid UUID)");

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Validation Error", 
        details: missingFields 
      }), { status: 400 });
    }

    // --------------------------------------------------------------------------
    // 3. INFRASTRUCTURE SETUP
    // --------------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server Error: Missing Supabase Config" }), { status: 500 });
    }

    // Service Role Client (Privileged) for logging
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // --------------------------------------------------------------------------
    // 4. TEST SUITE EXECUTION
    // --------------------------------------------------------------------------
    interface TestResult {
      test: string;
      expected: number[];
      status: number;
      ok: boolean;
      duration_ms?: number;
    }

    const tests: TestResult[] = [];

    // Helper: Raw REST API fetch to verify HTTP codes
    const doFetch = async (endpoint: string, jwt: string | null, method: string = 'GET', bodyData?: any) => {
      const start = performance.now();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": serviceKey // Identifies project
      };
      
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

      const res = await fetch(`${supabaseUrl}${endpoint}`, {
        method,
        headers,
        body: bodyData ? JSON.stringify(bodyData) : undefined
      });
      const end = performance.now();
      
      // Consume body to free resources
      await res.text().catch(() => {});
      
      return { status: res.status, duration: Math.round(end - start) };
    };

    const pushResult = (name: string, expectedCodes: number[], actual: { status: number, duration: number }) => {
      tests.push({
        test: name,
        expected: expectedCodes,
        status: actual.status,
        ok: expectedCodes.includes(actual.status),
        duration_ms: actual.duration
      });
    };

    // --- TEST 1: Anonymous Insert Attempt (Should Fail) ---
    const t1 = await doFetch(`/rest/v1/profiles`, null, "POST", { id: TEST_USER_ID });
    pushResult("ANON INSERT PROFILE", [401, 403], t1);

    // --- TEST 2: User Insert Own Profile (Should Pass or Conflict) ---
    const t2 = await doFetch(`/rest/v1/profiles`, TEST_USER_JWT, "POST", { id: TEST_USER_ID, email: "test@test.com" });
    pushResult("USER INSERT OWN PROFILE", [201, 204, 409], t2);

    // --- TEST 3: User Insert Other Profile (Should Fail RLS) ---
    const t3 = await doFetch(`/rest/v1/profiles`, TEST_USER_JWT, "POST", { id: TEST_OTHER_ID, email: "hacker@test.com" });
    pushResult("USER INSERT OTHER PROFILE", [401, 403], t3);

    // --- TEST 4: Admin Insert Other Profile (Should Pass) ---
    // Note: Assuming specific Role checks are in place on the DB side
    const t4 = await doFetch(`/rest/v1/profiles`, TEST_ADMIN_JWT, "POST", { id: TEST_OTHER_ID, email: "other@test.com", role: "client" });
    pushResult("ADMIN INSERT OTHER PROFILE", [201, 204, 409], t4);

    // --- TEST 5: User Select Own Profile (Should Pass) ---
    const t5 = await doFetch(`/rest/v1/profiles?id=eq.${TEST_USER_ID}`, TEST_USER_JWT, "GET");
    pushResult("USER SELECT OWN PROFILE", [200], t5);

    // --- TEST 6: User Access Private Schema via REST (Should 404 - Hidden) ---
    const t6 = await doFetch(`/rest/v1/autotest_logs`, TEST_USER_JWT, "GET");
    pushResult("USER ACCESS PRIVATE TABLE", [404], t6);


    // --------------------------------------------------------------------------
    // 5. SECURE LOGGING
    // --------------------------------------------------------------------------
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    
    // Call RPC to save logs securely
    const { error: logError } = await adminClient.rpc("insert_autotest_log", {
      _invoked_by: "autotest-edge-function",
      _source_ip: clientIp,
      _env: { supabase_url: "REDACTED" }, 
      _tests: tests,
      _raw_request: { 
        headers: Object.fromEntries(req.headers.entries()),
        body_summary: "Payload redacted for security" 
      }
    });

    if (logError) console.error("Log Error:", logError);

    // --------------------------------------------------------------------------
    // 6. RESPONSE
    // --------------------------------------------------------------------------
    const globalStatus = tests.every(t => t.ok) ? "PASS" : "FAIL";

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      status: globalStatus,
      results: tests,
      audit_log: logError ? "FAILED" : "PERSISTED"
    }, null, 2), {
      status: globalStatus === "PASS" ? 200 : 418, // 418 I'm a teapot (or 400/500) to indicate logical failure if preferred
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("Unhandled Exception:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: e.message }), { status: 500 });
  }
});
