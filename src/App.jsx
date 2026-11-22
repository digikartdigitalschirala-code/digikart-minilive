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
  { key: "sales", title: "Sales Entry", description: "అనుమతించిన Sales వివరాల నమోదు", anyOf: ["sales.create_closing", "sales.manage", "sales.view_permitted"] },
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

function EmployeeWorkspace({ profile, permissions, onLogout }) {
  const [active, setActive] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [customersById, setCustomersById] = useState({});
  const [followups, setFollowups] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [leadForm, setLeadForm] = useState({name:'', mobile:'', address:'', category:'TV', brand:'', details:'', source:'field_visit', expected:'', budget:'', priority:'medium', remarks:''});
  const [followForm, setFollowForm] = useState({lead_id:'', scheduled_at:'', response:'', notes:''});
  const [saleForm, setSaleForm] = useState({lead_id:'', category:'TV', product:'', brand:'', model:'', quantity:1, unit_price:'', service:false, installation:false, serial:'', order_ref:'', contact:'', installation_address:'', remarks:''});
  const employeeId = profile?.id;
  const canLeads = permissions?.['leads.view_assigned'] || permissions?.['leads.manage'];
  const canSales = permissions?.['sales.create_closing'] === true || permissions?.['sales.manage'] === true || permissions?.['employees.manage'] === true;
  const canInstall = permissions?.['installation.manage'] === true || permissions?.['employees.manage'] === true;

  useEffect(() => {
    const allowedTabs = [canLeads ? 'leads' : null, canLeads ? 'followups' : null, canSales ? 'sales' : null, canInstall ? 'installations' : null, 'records'].filter(Boolean);
    if (!allowedTabs.includes(active)) setActive(allowedTabs[0]);
  }, [canLeads, canSales, canInstall, active]);

  async function loadData() {
    if (!employeeId) return;
    setBusy(true); setNotice('');
    const [l, f, i] = await Promise.all([
      (canLeads || canSales) ? supabase.from('leads').select('id,lead_code,customer_id,product_category,product_brand_model,requirement_details,employee_remarks,status,priority,created_at,original_lead_owner_id,expected_purchase_date,approximate_budget,lead_source').order('created_at',{ascending:false}).limit(150) : Promise.resolve({data:[],error:null}),
      canLeads ? supabase.from('lead_followups').select('id,lead_id,scheduled_at,status,customer_response,followup_notes,task_assignee_id,created_at,completed_at').order('scheduled_at',{ascending:false}).limit(300) : Promise.resolve({data:[],error:null}),
      canInstall ? supabase.from('installation_tasks').select('id,task_code,status,created_at,current_assignee_id,sale_item_id,item:sale_items(product_name,brand,model,detail:sale_installation_details(installation_address,customer_contact_number))').order('created_at',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null})
    ]);
    let customerMap = {};
    const customerIds = [...new Set((l.data || []).map(x => x.customer_id).filter(Boolean))];
    if (customerIds.length) {
      const c = await supabase.from('customers').select('id,full_name,mobile_number,address').in('id', customerIds);
      if (c.error) setNotice('Customer వివరాలు చదవడంలో సమస్య: ' + c.error.message);
      else customerMap = Object.fromEntries((c.data || []).map(x => [x.id, x]));
    }
    const errors = [l.error,f.error,i.error].filter(Boolean);
    if (errors.length) setNotice('డేటాబేస్ చదవడంలో సమస్య: '+errors.map(x=>x.message).join(' | '));
    setLeads(l.data || []); setCustomersById(customerMap); setFollowups(f.data || []); setInstallations(i.data || []); setBusy(false);
  }
  useEffect(() => { loadData(); }, [employeeId]);

  function customerFor(lead) { return customersById[lead?.customer_id] || {}; }
  function phoneDigits(value) { return String(value || '').replace(/\D/g, ''); }
  function whatsappHref(value) {
    let number = phoneDigits(value);
    if (number.length === 10) number = '91' + number;
    return number ? `https://wa.me/${number}` : '#';
  }
  function leadFollowups(leadId) { return followups.filter(x => x.lead_id === leadId); }
  function leadCard(lead) {
    const customer = customerFor(lead);
    const phone = customer.mobile_number || '';
    const history = leadFollowups(lead.id);
    const ageHours = Math.max(0, (Date.now() - new Date(lead.created_at).getTime()) / 3600000);
    const attempts = history.length;
    return <article key={lead.id} style={{border:'1px solid #e5eaf2',borderRadius:12,padding:14,marginTop:10,background:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><b>{customer.full_name || 'Customer పేరు లేదు'} · {lead.lead_code}</b><span style={{fontSize:12,fontWeight:700,color:lead.priority==='high'?'#b42318':'#475467'}}>{String(lead.priority || 'medium').toUpperCase()} · {lead.status || 'new'}</span></div>
      <div style={{marginTop:7,fontSize:14,lineHeight:1.7}}><div>📞 {phone || 'Mobile number లేదు'}</div><div>📍 {customer.address || 'Address ఇవ్వలేదు'}</div><div>Product: {lead.product_category || '—'} {lead.product_brand_model ? `· ${lead.product_brand_model}` : ''}</div><div>Created: {lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN') : '—'} · Follow-up attempts: {attempts}</div><div>Protected period: {ageHours < 168 ? `${Math.ceil(168-ageHours)} గంటలు మిగిలి ఉన్నాయి` : '168 గంటలు పూర్తయ్యాయి'} </div>{lead.requirement_details && <div>Requirement: {lead.requirement_details}</div>}{lead.employee_remarks && <div>Remarks: {lead.employee_remarks}</div>}</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>{phone && <><a href={`tel:${phoneDigits(phone)}`} style={{...btn,textDecoration:'none',background:'#16803c'}}>Call Now</a><a href={whatsappHref(phone)} target="_blank" rel="noreferrer" style={{...btn,textDecoration:'none',background:'#128c7e'}}>WhatsApp</a></>}</div>
      {history.length>0 && <details style={{marginTop:10}}><summary>Follow-up History ({history.length})</summary>{history.map(h=><div key={h.id} style={{padding:'7px 0',borderBottom:'1px solid #edf0f4',fontSize:13}}>{new Date(h.scheduled_at).toLocaleString('en-IN')} · {h.status} · {h.customer_response || ''} · {h.followup_notes || ''}</div>)}</details>}
    </article>;
  }

  async function createLead(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const { data, error } = await supabase.rpc('dk_create_lead', {
        p_customer_name: leadForm.name.trim(),
        p_mobile_number: leadForm.mobile.trim() || null,
        p_address: leadForm.address.trim() || null,
        p_product_category: leadForm.category,
        p_brand_model: leadForm.brand.trim() || null,
        p_requirement_details: leadForm.details.trim() || null,
        p_lead_source: leadForm.source,
        p_expected_purchase_date: leadForm.expected || null,
        p_approximate_budget: leadForm.budget ? Number(leadForm.budget) : null,
        p_priority: leadForm.priority,
        p_employee_remarks: leadForm.remarks.trim() || null
      });
      if (error) throw error;
      setLeadForm({name:'',mobile:'',address:'',category:'TV',brand:'',details:'',source:'field_visit',expected:'',budget:'',priority:'medium',remarks:''});
      setNotice(`Lead ${data?.lead_code || ''} విజయవంతంగా నమోదు అయింది.`); await loadData();
    } catch(err) { setNotice('Lead సేవ్ కాలేదు: '+(err.message||'Unknown error')); }
    finally { setBusy(false); }
  }

  async function createFollowup(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    const {error} = await supabase.from('lead_followups').insert({lead_id:followForm.lead_id,scheduled_at:new Date(followForm.scheduled_at).toISOString(),task_assignee_id:employeeId,created_by:employeeId,customer_response:followForm.response.trim()||null,followup_notes:followForm.notes.trim()||null,status:'pending'});
    setBusy(false);
    if(error) setNotice('Follow-up సేవ్ కాలేదు: '+error.message); else {setNotice('Follow-up నమోదు అయింది.');setFollowForm({lead_id:'',scheduled_at:'',response:'',notes:''});await loadData();}
  }
  async function updateFollowupStatus(followupId, status) {
    setBusy(true); setNotice('');
    const updates = { status, completed_at: status === 'completed' ? new Date().toISOString() : null };
    const { error } = await supabase.from('lead_followups').update(updates).eq('id', followupId);
    if (error) setNotice('Follow-up Status మార్చలేకపోయాం: ' + error.message);
    else setNotice(status === 'completed' ? 'Follow-up పూర్తయినట్లు నమోదు అయింది.' : 'Follow-up మళ్లీ Pendingలోకి మార్చబడింది.');
    await loadData();
    setBusy(false);
  }

  async function claimInstallation(taskId) {
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('dk_claim_installation_task', { p_task_id: taskId, p_notes: null });
    if (error) setNotice('Installation Task claim కాలేదు: ' + error.message);
    else setNotice('Installation Task మీకు కేటాయించబడింది.');
    await loadData();
    setBusy(false);
  }

  async function createSale(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const chosenLead = leads.find(x => x.id === saleForm.lead_id);
      if (!chosenLead) throw new Error('దయచేసి సరైన Lead ఎంచుకోండి.');
      if (saleForm.installation && (!saleForm.installation_address.trim() || !saleForm.contact.trim())) {
        throw new Error('Installation కోసం పూర్తి Address మరియు Customer Contact Number తప్పనిసరి.');
      }
      const { data, error } = await supabase.rpc('dk_create_sale', {
        p_lead_id: chosenLead.id,
        p_product_category: saleForm.category.trim(),
        p_product_name: saleForm.product.trim(),
        p_brand: saleForm.brand.trim() || null,
        p_model: saleForm.model.trim() || null,
        p_quantity: Number(saleForm.quantity),
        p_unit_price: Number(saleForm.unit_price),
        p_service_call_required: saleForm.service,
        p_installation_required: saleForm.installation,
        p_serial_number: saleForm.serial.trim() || null,
        p_order_reference: saleForm.order_ref.trim() || null,
        p_customer_contact_number: saleForm.contact.trim() || null,
        p_installation_address: saleForm.installation_address.trim() || null,
        p_remarks: saleForm.remarks.trim() || null
      });
      if (error) throw error;
      setNotice(`Sale ${data?.sale_code || ''} నమోదు అయింది. ${data?.installation_task_created ? 'Installation Task సృష్టించబడింది. ' : ''}${data?.service_task_created ? 'Service Task సృష్టించబడింది. ' : ''}${data?.incentive_created ? 'Incentive 70:30 లెక్క pending approvalలో ఉంది.' : 'ఈ Product‌కు ప్రస్తుతం active incentive rate లేకపోవచ్చు; Admin rate తనిఖీ చేయాలి.'}`);
      setSaleForm({lead_id:'',category:'TV',product:'',brand:'',model:'',quantity:1,unit_price:'',service:false,installation:false,serial:'',order_ref:'',contact:'',installation_address:'',remarks:''});
      await loadData();
    } catch(err) {
      setNotice('Sale సేవ్ కాలేదు: '+(err.message||'Unknown error'));
    } finally { setBusy(false); }
  }

  const field = {width:'100%',padding:11,border:'1px solid #ccd4e0',borderRadius:8,boxSizing:'border-box',fontSize:14};
  const btn = {padding:'11px 16px',border:0,borderRadius:8,background:'#e87518',color:'#fff',fontWeight:700,cursor:'pointer'};
  const panel = {background:'#fff',border:'1px solid #e5eaf2',borderRadius:13,padding:18,marginBottom:14};
  const label = (s) => <label style={{display:'block',fontSize:13,fontWeight:700,marginBottom:6,color:'#344054'}}>{s}</label>;
  return <div style={{minHeight:'100vh',background:'#f3f6fb',fontFamily:'Arial,sans-serif',color:'#14213d'}}>
    <header style={{background:'#0b285d',color:'#fff',padding:'15px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><b>Digi Kart Digitals</b><div style={{fontSize:12,opacity:.8}}>Employee Mini Live · {profile?.full_name}</div></div><button onClick={onLogout} style={{padding:'9px 13px',border:0,borderRadius:8}}>Logout</button></header>
    <main style={{maxWidth:1100,margin:'auto',padding:18}}>
      <h2 style={{margin:'8px 0 16px'}}>Employee Workspace</h2>
      <nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{[['leads','New Lead',canLeads],['followups','Follow-ups',canLeads],['sales','Sale Entry',canSales],['installations','Installations',canInstall],['records','My Records',true]].filter(([, , allowed])=>allowed).map(([k,t])=><button key={k} onClick={()=>setActive(k)} style={{...btn,background:active===k?'#0b285d':'#e4eaf3',color:active===k?'white':'#24344d'}}>{t}</button>)}</nav>
      {notice && <div role="status" style={{...panel,background:'#fff8e8',borderColor:'#f0d49b',lineHeight:1.5}}>{notice}</div>}
      {active==='leads' && canLeads && <>
        <form onSubmit={createLead} style={panel}><h3>కొత్త Lead నమోదు</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
          <div>{label('Customer Name *')}<input required value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} style={field}/></div>
          <div>{label('Mobile Number')}<input value={leadForm.mobile} onChange={e=>setLeadForm({...leadForm,mobile:e.target.value})} style={field}/></div>
          <div>{label('Address / Area')}<input value={leadForm.address} onChange={e=>setLeadForm({...leadForm,address:e.target.value})} style={field}/></div>
          <div>{label('Product Category *')}<select value={leadForm.category} onChange={e=>setLeadForm({...leadForm,category:e.target.value})} style={field}>{['TV','AC','Refrigerator','Washing Machine','Cooler','Fan','Other'].map(x=><option>{x}</option>)}</select></div>
          <div>{label('Brand / Model')}<input value={leadForm.brand} onChange={e=>setLeadForm({...leadForm,brand:e.target.value})} style={field}/></div>
          <div>{label('Lead Source *')}<select value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})} style={field}>{[['field_visit','Field Visit'],['reference','Reference'],['whatsapp','WhatsApp'],['phone_call','Phone Call'],['outside_lead','Outside Lead'],['other','Other']].map(([v,t])=><option value={v}>{t}</option>)}</select></div>
          <div>{label('Expected Purchase Date')}<input type="date" value={leadForm.expected} onChange={e=>setLeadForm({...leadForm,expected:e.target.value})} style={field}/></div>
          <div>{label('Approx. Budget')}<input type="number" min="0" value={leadForm.budget} onChange={e=>setLeadForm({...leadForm,budget:e.target.value})} style={field}/></div>
          <div>{label('Priority')}<select value={leadForm.priority} onChange={e=>setLeadForm({...leadForm,priority:e.target.value})} style={field}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div style={{gridColumn:'1/-1'}}>{label('Requirement / Remarks')}<textarea value={leadForm.details} onChange={e=>setLeadForm({...leadForm,details:e.target.value})} style={{...field,minHeight:70}}/></div>
        </div><button disabled={busy} style={{...btn,marginTop:14}}>{busy?'Saving...':'Lead Save'}</button></form>
        <section style={panel}><h3>నా Leads ({leads.length})</h3>{leads.map(leadCard)}{!leads.length&&<p>Leads లేవు.</p>}</section>
      </>}
      {active==='followups' && <>
        <form onSubmit={createFollowup} style={panel}><h3>Follow-up నమోదు</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}><div>{label('Lead *')}<select required value={followForm.lead_id} onChange={e=>setFollowForm({...followForm,lead_id:e.target.value})} style={field}><option value="">Lead ఎంచుకోండి</option>{leads.map(l=><option value={l.id}>{l.lead_code} · {l.product_category}</option>)}</select></div><div>{label('Follow-up Date & Time *')}<input required type="datetime-local" value={followForm.scheduled_at} onChange={e=>setFollowForm({...followForm,scheduled_at:e.target.value})} style={field}/></div><div>{label('Customer Response')}<input value={followForm.response} onChange={e=>setFollowForm({...followForm,response:e.target.value})} style={field}/></div><div>{label('Notes')}<input value={followForm.notes} onChange={e=>setFollowForm({...followForm,notes:e.target.value})} style={field}/></div></div><button disabled={busy} style={{...btn,marginTop:14}}>Follow-up Save</button></form>
        <section style={panel}><h3>Follow-up History</h3>{followups.map(f=>{const lead=leads.find(x=>x.id===f.lead_id);const customer=lead?customerFor(lead):{};const phone=customer.mobile_number||'';return <div key={f.id} style={{padding:'10px 0',borderBottom:'1px solid #edf0f4'}}><b>{customer.full_name||'Customer'} · {lead?.lead_code||'Lead'}</b><div style={{fontSize:13,margin:'5px 0'}}>{new Date(f.scheduled_at).toLocaleString('en-IN')} · {f.status} · {f.followup_notes||f.customer_response||'—'}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{phone&&<><a href={`tel:${phoneDigits(phone)}`} style={{...btn,textDecoration:'none',background:'#16803c'}}>Call Now</a><a href={whatsappHref(phone)} target="_blank" rel="noreferrer" style={{...btn,textDecoration:'none',background:'#128c7e'}}>WhatsApp</a></>}{f.status!=='completed'&&<button type="button" disabled={busy} onClick={()=>updateFollowupStatus(f.id,'completed')} style={{...btn,padding:'7px 10px'}}>Completed</button>}</div></div>})}{!followups.length&&<p>Follow-ups లేవు.</p>}</section>
      </>}
      {active==='sales' && canSales && <form onSubmit={createSale} style={panel}><h3>Sale Entry</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}><div>{label('Converted Lead *')}<select required value={saleForm.lead_id} onChange={e=>setSaleForm({...saleForm,lead_id:e.target.value})} style={field}><option value="">Lead ఎంచుకోండి</option>{leads.map(l=><option value={l.id}>{l.lead_code} · {l.product_category}</option>)}</select></div><div>{label('Category *')}<input required value={saleForm.category} onChange={e=>setSaleForm({...saleForm,category:e.target.value})} style={field}/></div><div>{label('Product Name *')}<input required value={saleForm.product} onChange={e=>setSaleForm({...saleForm,product:e.target.value})} style={field}/></div><div>{label('Brand')}<input value={saleForm.brand} onChange={e=>setSaleForm({...saleForm,brand:e.target.value})} style={field}/></div><div>{label('Model')}<input value={saleForm.model} onChange={e=>setSaleForm({...saleForm,model:e.target.value})} style={field}/></div><div>{label('Quantity *')}<input type="number" min="1" required value={saleForm.quantity} onChange={e=>setSaleForm({...saleForm,quantity:e.target.value})} style={field}/></div><div>{label('Unit Price *')}<input type="number" min="0" step="0.01" required value={saleForm.unit_price} onChange={e=>setSaleForm({...saleForm,unit_price:e.target.value})} style={field}/></div></div><div style={{display:'flex',gap:18,flexWrap:'wrap',margin:'16px 0'}}><label><input type="checkbox" checked={saleForm.service} onChange={e=>setSaleForm({...saleForm,service:e.target.checked})}/> Service Call Required</label><label><input type="checkbox" checked={saleForm.installation} onChange={e=>setSaleForm({...saleForm,installation:e.target.checked})}/> Installation Required</label></div>{(saleForm.service||saleForm.installation)&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}><div>{label('Serial Number')}<input value={saleForm.serial} onChange={e=>setSaleForm({...saleForm,serial:e.target.value})} style={field}/></div><div>{label('Order Reference')}<input value={saleForm.order_ref} onChange={e=>setSaleForm({...saleForm,order_ref:e.target.value})} style={field}/></div><div>{label(saleForm.installation ? 'Customer Contact *' : 'Customer Contact')}<input required={saleForm.installation} value={saleForm.contact} onChange={e=>setSaleForm({...saleForm,contact:e.target.value})} style={field}/></div>{saleForm.installation && <div style={{gridColumn:'1/-1'}}>{label('Installation Address *')}<textarea required value={saleForm.installation_address} onChange={e=>setSaleForm({...saleForm,installation_address:e.target.value})} style={{...field,minHeight:65}}/></div>}<div>{label('Remarks')}<input value={saleForm.remarks} onChange={e=>setSaleForm({...saleForm,remarks:e.target.value})} style={field}/></div></div>}<button disabled={busy} style={{...btn,marginTop:14}}>Sale Save</button></form>}
      {active==='installations' && canInstall && <section style={panel}><h3>Pending Installation Tasks ({installations.length})</h3>{installations.map(t=><div key={t.id} style={{padding:'12px 0',borderBottom:'1px solid #edf0f4',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><b>{t.task_code}</b><div style={{fontSize:13,color:'#344054'}}>{t.item?.product_name || 'Installation' } {t.item?.brand || ''} {t.item?.model || ''}</div><div style={{fontSize:13,color:'#667085'}}>Status: {t.status} · Created: {new Date(t.created_at).toLocaleString()}</div>{t.item?.detail?.[0]?.installation_address && <div style={{fontSize:12,color:'#475467'}}>Address: {t.item.detail[0].installation_address}</div>}{t.item?.detail?.[0]?.customer_contact_number && <div style={{fontSize:12,color:'#475467'}}>Contact: {t.item.detail[0].customer_contact_number}</div>}</div>{t.status==='pending' && <button disabled={busy} onClick={()=>claimInstallation(t.id)} style={btn}>Claim Task</button>}{t.status==='in_progress' && <span style={{fontSize:12,color:'#475467'}}>{t.current_assignee_id===employeeId?'మీరు Claim చేశారు':'ఇప్పటికే Claim అయింది'}</span>}</div>)}{!installations.length&&<p>Pending Installation Tasks లేవు.</p>}</section>}
      {active==='records' && <>
        <section style={panel}><h3>My Records</h3><p>Leads: {leads.length} · Follow-ups: {followups.length}</p><button onClick={loadData} disabled={busy} style={btn}>{busy?'Refreshing...':'Refresh Records'}</button></section>
        <section style={panel}><h3>నా Lead Records ({leads.length})</h3>{leads.map(leadCard)}{!leads.length&&<p>మీకు సంబంధించిన Leads లేవు.</p>}</section>
        <section style={panel}><h3>నా Follow-up Records ({followups.length})</h3>{followups.map(f=>{const lead=leads.find(x=>x.id===f.lead_id);const customer=lead?customerFor(lead):{};const phone=customer.mobile_number||'';return <div key={f.id} style={{padding:'10px 0',borderBottom:'1px solid #edf0f4'}}><b>{customer.full_name||'Customer'} · {lead?.lead_code||'Lead'}</b><div style={{fontSize:13,margin:'5px 0'}}>{new Date(f.scheduled_at).toLocaleString('en-IN')} · {f.status} · {f.followup_notes||f.customer_response||'—'}</div>{phone&&<div style={{display:'flex',gap:8}}><a href={`tel:${phoneDigits(phone)}`} style={{...btn,textDecoration:'none',background:'#16803c'}}>Call</a><a href={whatsappHref(phone)} target="_blank" rel="noreferrer" style={{...btn,textDecoration:'none',background:'#128c7e'}}>WhatsApp</a></div>}</div>})}{!followups.length&&<p>Follow-ups లేవు.</p>}</section>
      </>}
      {busy && <p style={{color:'#667085'}}>దయచేసి వేచి ఉండండి…</p>}
    </main>
  </div>;
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
    return <EmployeeWorkspace profile={profileState.profile} permissions={profileState.permissions} onLogout={handleLogout} />;
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
