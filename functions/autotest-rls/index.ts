
// ==============================================================================
// EDGE FUNCTION: AUTOTEST RLS (SECURITY AUDIT)
// ==============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// Global Deno type definition for TypeScript environments
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// UUID Validator
function isUuid(v: unknown): boolean {
  return typeof v === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}

Deno.serve(async (req: Request) => {
  try {
    // 1. Authorization
    const secret = Deno.env.get("AUTOTEST_SECRET");
    const headerSecret = req.headers.get("x-autotest-secret");

    if (!secret || secret !== headerSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 2. Parse Body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
    }

    const { TEST_USER_JWT, TEST_ADMIN_JWT, TEST_USER_ID, TEST_OTHER_ID } = body;

    // 3. Setup Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Service client for logging results
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 4. Test Logic
    const tests: any[] = [];
    const doFetch = async (endpoint: string, jwt: string | null, method = 'GET', data?: any) => {
      const start = performance.now();
      const headers: any = { 
        "apikey": serviceKey,
        "Content-Type": "application/json" 
      };
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

      const res = await fetch(`${supabaseUrl}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      await res.text(); // drain
      return { status: res.status, duration: Math.round(performance.now() - start) };
    };

    const runTest = async (name: string, exp: number[], fn: () => Promise<{status: number, duration: number}>) => {
      const res = await fn();
      tests.push({
        test: name,
        expected: exp,
        status: res.status,
        ok: exp.includes(res.status),
        duration_ms: res.duration
      });
    };

    // EXECUTE TESTS
    await runTest("ANON INSERT PROFILE", [401, 403], () => doFetch('/rest/v1/profiles', null, 'POST', { id: TEST_USER_ID }));
    await runTest("USER READ OWN PROFILE", [200], () => doFetch(`/rest/v1/profiles?id=eq.${TEST_USER_ID}`, TEST_USER_JWT));
    await runTest("USER READ OTHER PROFILE", [200], () => doFetch(`/rest/v1/profiles?id=eq.${TEST_OTHER_ID}`, TEST_USER_JWT)); // Public profiles
    await runTest("ADMIN READ ALL", [200, 206], () => doFetch('/rest/v1/profiles?select=count', TEST_ADMIN_JWT));

    // 5. Log Results
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    await adminClient.rpc("insert_autotest_log", {
      _invoked_by: "autotest-function",
      _source_ip: clientIp,
      _env: { url: "REDACTED" },
      _tests: tests,
      _raw_request: { header_keys: [...req.headers.keys()] }
    });

    return new Response(JSON.stringify({ status: tests.every(t => t.ok) ? "PASS" : "FAIL", results: tests }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
