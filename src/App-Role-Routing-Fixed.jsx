import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import "./App.css";

const ADMIN_AUTH_ID = "bcc12aef-2827-471c-a0fe-4bab52377ec1";
const ADMIN_EMAIL = "dkadmin1@digikart.local";

// These permission codes already exist in the Supabase roles/permissions setup.
const EMPLOYEE_MODULES = [
  { key: "leads", title: "Leads & Enquiries", description: "మీకు కేటాయించిన Leads మరియు Enquiries", anyOf: ["leads.view_assigned", "leads.manage"] },
  { key: "customers", title: "Customers", description: "Customer వివరాలను చూడటం / నిర్వహించడం", anyOf: ["customers.view", "customers.manage"] },
  { key: "followups", title: "Follow-ups", description: "కస్టమర్ కాల్స్ మరియు Follow-up వివరాలు", anyOf: ["leads.view_assigned", "leads.manage"] },
  { key: "sales", title: "Sales Entry", description: "అనుమతించిన Sales వివరాల నమోదు", anyOf: ["sales.create_closing", "sales.view_permitted"] },
  { key: "service", title: "Service Records", description: "Service పనులు మరియు కస్టమర్ వివరాలు", anyOf: ["service.manage"] },
  { key: "installation", title: "Installations", description: "Pending Installation పనులు", anyOf: ["installation.manage"] },
  { key: "incentives", title: "My Incentives", description: "మీకు అనుమతించిన Incentive వివరాలు", anyOf: ["incentives.view_permitted"] },
  { key: "reports", title: "Reports", description: "మీ Role‌కు అనుమతించిన Reports", anyOf: ["reports.view_permitted"] },
  { key: "chat", title: "Team Chat", description: "టీమ్‌తో అంతర్గత సంభాషణ", anyOf: ["chat.use"] },
  { key: "employees", title: "Employee Management", description: "సిబ్బంది వివరాల నిర్వహణ", anyOf: ["employees.manage"] }
];

function EmployeeHome({ profile, permissions, rolePending, permissionWarning, onLogout }) {
  const name = profile?.full_name || profile?.employee_code || "Employee";
  const role = profile?.role || "Employee";
  const visibleModules = EMPLOYEE_MODULES.filter((item) => item.anyOf.some((permission) => permissions?.[permission] === true));

  return (
    <div style={{ minHeight: "100vh", background: "#f3f6fb", fontFamily: "Arial, sans-serif", color: "#14213d" }}>
      <header style={{ background: "#0b285d", color: "white", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><div style={{ fontWeight: 800, fontSize: 18 }}>Digi Kart Digitals</div><div style={{ opacity: .8, fontSize: 12 }}>Employee Workspace</div></div>
        <button onClick={onLogout} style={{ border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontWeight: 700 }}>Logout</button>
      </header>
      <main style={{ maxWidth: 1050, margin: "0 auto", padding: "28px 18px" }}>
        <section style={{ background: "white", borderRadius: 16, padding: 22, boxShadow: "0 4px 18px #10265312", marginBottom: 20 }}>
          <div style={{ color: "#e87518", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>EMPLOYEE DASHBOARD</div>
          <h1 style={{ margin: "8px 0", fontSize: 25 }}>శుభోదయం, {name} 👋</h1>
          <p style={{ margin: 0, color: "#667085" }}>Employee ID: {profile?.employee_code || "—"} &nbsp; | &nbsp; Role: {role}</p>
        </section>
        {rolePending && <div style={{ background: "#fff7e6", border: "1px solid #f3d49b", color: "#80520a", borderRadius: 12, padding: 14, marginBottom: 18, lineHeight: 1.6 }}><b>గమనిక:</b> మీ Employee Account గుర్తించబడింది. కానీ మీకు ఇంకా Role Permissions కేటాయించలేదు. Admin‌ను సంప్రదించండి. భద్రత కోసం అనుమతి లేని Modules చూపించబడవు.</div>}
        {permissionWarning && <div style={{ background: "#fff0f0", border: "1px solid #f2c4c4", color: "#9b2525", borderRadius: 12, padding: 14, marginBottom: 18, lineHeight: 1.6 }}>కొన్ని Permissions‌ను పరిశీలించలేకపోయాం. భద్రత కోసం ఆ Modules దాచబడ్డాయి. Internet కనెక్షన్ తనిఖీ చేసి మళ్లీ Login చేయండి.</div>}
        <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>మీకు అనుమతించిన Modules</h2>
        {visibleModules.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {visibleModules.map((item) => <div key={item.key} style={{ background: "white", border: "1px solid #e5eaf2", borderRadius: 13, padding: 18, minHeight: 105 }}><div style={{ fontWeight: 800, marginBottom: 8 }}>{item.title}</div><div style={{ color: "#667085", fontSize: 13, lineHeight: 1.5 }}>{item.description}</div><div style={{ color: "#9aa4b2", fontSize: 11, marginTop: 12 }}>అనుమతి ఉంది · Module అనుసంధానం కొనసాగుతోంది</div></div>)}
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5eaf2", borderRadius: 13, padding: 22, color: "#667085" }}>ప్రస్తుతం చూపించడానికి అనుమతించిన Module లేదు.</div>
        )}
        <p style={{ color: "#7a8495", fontSize: 12, marginTop: 22 }}>గమనిక: ఈ దశలో Dashboard Routing మరియు Permission ఆధారిత Module Visibility మాత్రమే అమలులో ఉన్నాయి. Module‌లలోని పూర్తి Database పనులు ఇంకా అనుసంధానం కాలేదు.</p>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profileState, setProfileState] = useState({ loading: false, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "" });
  const dashboardFrame = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Resolve the signed-in employee through the existing SECURITY DEFINER RPC.
  // This avoids directly reading employee_auth, which is Admin-only under current RLS.
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user) {
        setProfileState({ loading: false, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "" });
        return;
      }

      const email = (session.user.email || "").toLowerCase();
      if (session.user.id === ADMIN_AUTH_ID || email === ADMIN_EMAIL) {
        setProfileState({ loading: false, admin: true, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "" });
        return;
      }

      setProfileState({ loading: true, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "" });

      const { data: employeeIdFromAuth, error: employeeIdError } = await supabase.rpc("current_employee_id");
      if (cancelled) return;
      if (employeeIdError || !employeeIdFromAuth) {
        setProfileState({ loading: false, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "ఈ Login‌కు సంబంధించిన Active Employee Profile కనుగొనబడలేదు. Admin‌ను సంప్రదించండి." });
        return;
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, employee_code, full_name, role, status")
        .eq("id", employeeIdFromAuth)
        .maybeSingle();
      if (cancelled) return;
      if (employeeError || !employee) {
        setProfileState({ loading: false, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "Employee Profile చదవలేకపోయాం. Admin‌ను సంప్రదించండి." });
        return;
      }
      if (employee.status !== "active") {
        await supabase.auth.signOut();
        if (!cancelled) setProfileState({ loading: false, admin: false, profile: null, permissions: {}, rolePending: false, permissionWarning: false, error: "మీ Employee Account ప్రస్తుతం Active‌లో లేదు. Admin‌ను సంప్రదించండి." });
        return;
      }

      const permissionCodes = [...new Set(EMPLOYEE_MODULES.flatMap((item) => item.anyOf))];
      const permissionResults = await Promise.all(permissionCodes.map(async (permissionCode) => {
        const result = await supabase.rpc("has_permission", { required_permission: permissionCode });
        return { permissionCode, allowed: result.data === true && !result.error, error: !!result.error };
      }));
      if (cancelled) return;

      const permissions = {};
      permissionResults.forEach(({ permissionCode, allowed }) => { permissions[permissionCode] = allowed; });
      const permissionWarning = permissionResults.some((item) => item.error);
      const anyPermission = Object.values(permissions).some(Boolean);
      setProfileState({
        loading: false,
        admin: false,
        profile: employee,
        permissions,
        rolePending: !anyPermission && !permissionWarning,
        permissionWarning,
        error: ""
      });
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session]);

  // Employee creation requests are accepted only in the Admin dashboard iframe.
  useEffect(() => {
    async function handleDashboardMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== dashboardFrame.current?.contentWindow) return;
      const request = event.data || {};
      if (request.type !== "DK_CREATE_EMPLOYEE") return;

      if (!session || !profileState.admin) {
        dashboardFrame.current?.contentWindow?.postMessage({ type: "DK_CREATE_EMPLOYEE_RESULT", requestId: request.requestId, success: false, error: "Admin అనుమతి అవసరం. మళ్లీ Admin Login చేయండి." }, window.location.origin);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("create-employee", { body: request.payload });
        dashboardFrame.current?.contentWindow?.postMessage({ type: "DK_CREATE_EMPLOYEE_RESULT", requestId: request.requestId, success: !error && data?.success === true, data: data || null, error: error?.message || data?.error || null }, window.location.origin);
      } catch (error) {
        dashboardFrame.current?.contentWindow?.postMessage({ type: "DK_CREATE_EMPLOYEE_RESULT", requestId: request.requestId, success: false, error: error instanceof Error ? error.message : "Request failed" }, window.location.origin);
      }
    }

    window.addEventListener("message", handleDashboardMessage);
    return () => window.removeEventListener("message", handleDashboardMessage);
  }, [session, profileState.admin]);

  // Keep the existing 15-minute inactivity logout behavior.
  useEffect(() => {
    if (!session) return;
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        setPassword("");
        alert("15 నిమిషాలుగా ఎలాంటి Activity లేదు. భద్రత కోసం మీరు Logout అయ్యారు.");
      }, 15 * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    const frameDocument = dashboardFrame.current?.contentDocument;
    if (frameDocument) events.forEach((event) => frameDocument.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
        frameDocument?.removeEventListener(event, resetTimer);
      });
    };
  }, [session, profileState.admin]);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    if (!employeeId.trim() || !password) {
      setMessage("Employee ID మరియు Password నమోదు చేయండి.");
      return;
    }
    setLoading(true);
    const email = `${employeeId.trim().toLowerCase()}@digikart.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("Login విఫలమైంది: Employee ID లేదా Password సరిచూడండి.");
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setPassword("");
  }

  if (session) {
    if (profileState.loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial" }}>మీ Account వివరాలు పరిశీలిస్తున్నాం...</div>;
    if (profileState.error) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f6fb", fontFamily: "Arial", padding: 20 }}><div style={{ background: "white", padding: 24, borderRadius: 14, maxWidth: 480 }}><h3>Login వివరాలు</h3><p>{profileState.error}</p><button onClick={handleLogout}>Logout</button></div></div>;
    if (profileState.admin) {
      return <>
        <div style={{ position: "fixed", top: 10, right: 10, zIndex: 99999, display: "flex", alignItems: "center", gap: 12, background: "white", padding: "8px 12px", borderRadius: 10, boxShadow: "0 2px 10px #0002" }}><span style={{ color: "#14213d", fontWeight: "bold" }}>Admin Logged In</span><button onClick={handleLogout}>Logout</button></div>
        <iframe ref={dashboardFrame} src="/digi-kart-dashboard.html" title="Digi Kart Admin Dashboard" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }} />
      </>;
    }
    return <EmployeeHome profile={profileState.profile} permissions={profileState.permissions} rolePending={profileState.rolePending} permissionWarning={profileState.permissionWarning} onLogout={handleLogout} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #071b49, #174b91, #e87518)", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 410, background: "white", padding: 32, borderRadius: 20, boxShadow: "0 15px 45px #0004", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 25 }}><div style={{ width: 65, height: 65, borderRadius: 18, background: "#0b285d", color: "white", display: "inline-flex", justifyContent: "center", alignItems: "center", fontSize: 25, fontWeight: "bold" }}>DK</div><h2 style={{ color: "#102653", marginBottom: 5 }}>Digi Kart Digitals</h2><p style={{ color: "#777", marginTop: 5 }}>Lead & Sales Management System</p></div>
        <h3 style={{ color: "#14213d" }}>Employee Login</h3>
        <label style={{ display: "block", marginBottom: 7 }}>Employee ID</label>
        <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="ఉదా: DKADMIN1" autoComplete="username" style={{ width: "100%", padding: 13, border: "1px solid #ccc", borderRadius: 9, marginBottom: 18, boxSizing: "border-box" }} />
        <label style={{ display: "block", marginBottom: 7 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="మీ Password నమోదు చేయండి" autoComplete="current-password" style={{ width: "100%", padding: 13, border: "1px solid #ccc", borderRadius: 9, marginBottom: 18, boxSizing: "border-box" }} />
        {message && <p style={{ color: "#c62828", background: "#fff0f0", padding: 10, borderRadius: 8, fontSize: 14 }}>{message}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 14, border: "none", borderRadius: 9, background: "#e87518", color: "white", fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>{loading ? "Logging in..." : "LOGIN"}</button>
        <p style={{ textAlign: "center", color: "#888", fontSize: 12, marginTop: 22 }}>Authorized Employees Only</p>
      </form>
    </div>
  );
}
