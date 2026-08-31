// Roshan Technologies CRM — LOCAL DEMO MODE
// No Flask API, VPS, PostgreSQL or production data is used.
// All test data is stored in this browser's localStorage only.

const BASE_URL = 'local-demo://crm';
const API = {
  login: BASE_URL + '/login',
  getLeads: BASE_URL + '/leads',
  getCompanies: BASE_URL + '/companies',
  getCompanyDetail: (id) => BASE_URL + '/companies/' + id,
  searchCompanies: (q) => BASE_URL + '/companies/search?q=' + encodeURIComponent(q),
  addCompany: BASE_URL + '/companies',
  getQuotes: BASE_URL + '/quotes', saveQuote: BASE_URL + '/quotes',
  updateQuote: (id) => BASE_URL + '/quotes/' + id, deleteQuote: (id) => BASE_URL + '/quotes/' + id,
  downloadQuoteAttachment: (id) => BASE_URL + '/quotes/' + id + '/attachment',
  getVendorCategories: BASE_URL + '/vendor-categories', getSalespersons: BASE_URL + '/salespersons',
  getVendors: BASE_URL + '/vendors', saveVendor: BASE_URL + '/vendors',
  updateVendor: (id) => BASE_URL + '/vendors/' + id, deleteVendor: (id) => BASE_URL + '/vendors/' + id,
  saveLead: BASE_URL + '/leads', updateLead: (id) => BASE_URL + '/leads/' + id,
  updateStage: (id) => BASE_URL + '/leads/' + id + '/stage', getStats: BASE_URL + '/stats',
  getReminders: BASE_URL + '/reminders', saveReminder: BASE_URL + '/reminders',
  updateReminder: (id) => BASE_URL + '/reminders/' + id, deleteReminder: (id) => BASE_URL + '/reminders/' + id,
  getUsers: BASE_URL + '/users', addUser: BASE_URL + '/users', updateRole: (id) => BASE_URL + '/users/' + id,
  updatePassword: (id) => BASE_URL + '/users/' + id + '/password', logActivity: BASE_URL + '/activities',
  getActivities: (from, to) => BASE_URL + '/activities' + ((from || to) ? '?' + [from ? 'from=' + encodeURIComponent(from) : '', to ? 'to=' + encodeURIComponent(to) : ''].filter(Boolean).join('&') : ''),
  getSettings: BASE_URL + '/settings', regenerateKey: BASE_URL + '/settings/regenerate-key'
};

const DEMO_KEY = 'roshan_crm_demo_v1';

function demoSeed() {
  const today = new Date();
  const iso = n => { const d = new Date(today); d.setDate(d.getDate()+n); return d.toISOString(); };
  return {
    users: [
      {id:'u1',name:'Admin User',email:'admin@demo.com',password:'admin123',role:'admin',status:'Active',manager_id:null,employee_id:'EMP-001',phone:'0300-1111111',designation:'Administrator'},
      {id:'u2',name:'Sales Manager',email:'manager@demo.com',password:'manager123',role:'manager',status:'Active',manager_id:null,employee_id:'EMP-002',phone:'0300-2222222',designation:'Sales Manager'},
      {id:'u3',name:'Ali Khan',email:'sales@demo.com',password:'sales123',role:'sales',status:'Active',manager_id:'u2',employee_id:'EMP-003',phone:'0300-3333333',designation:'Sales Executive'},
      {id:'u4',name:'Quote Manager',email:'quote@demo.com',password:'quote123',role:'quote_manager',status:'Active',manager_id:null,employee_id:'EMP-004',phone:'0300-4444444',designation:'Quote Manager'}
    ],
    companies: [
      {id:'c1',name:'Acme Technologies'}, {id:'c2',name:'Blue Ocean Foods'}, {id:'c3',name:'Crescent Industries'}, {id:'c4',name:'Digital Solutions PK'}
    ],
    leads: [
      {id:'l1',company:'Acme Technologies',company_id:'c1',contact:'Ahmed Raza',email:'ahmed@acme.test',phone:'0301-1000001',product:'ERP Implementation',value:25000,currency:'USD',stage:'Proposal Sent',priority:'High',lead_status:'Active',notes:'Demo opportunity for ERP.',address:'Karachi',location_link:'',contact2_name:'',contact2_email:'',contact2_phone:'',assigned_to:'u3',created_by:'u3',rep:'Ali Khan',repInitials:'AK',repColor:'teal',manager_name:'Sales Manager',created_at:iso(-8),updated_at:iso(-1)},
      {id:'l2',company:'Blue Ocean Foods',company_id:'c2',contact:'Sara Ahmed',email:'sara@blue.test',phone:'0302-1000002',product:'Website & E-commerce',value:450000,currency:'PKR',stage:'Demo',priority:'Medium',lead_status:'Active',notes:'Interested in a new commerce platform.',address:'Lahore',location_link:'',contact2_name:'',contact2_email:'',contact2_phone:'',assigned_to:'u3',created_by:'u3',rep:'Ali Khan',repInitials:'AK',repColor:'teal',manager_name:'Sales Manager',created_at:iso(-5),updated_at:iso(-2)},
      {id:'l3',company:'Crescent Industries',company_id:'c3',contact:'Bilal Hussain',email:'bilal@crescent.test',phone:'0303-1000003',product:'Cloud Services',value:18000,currency:'USD',stage:'Closed Won',priority:'High',lead_status:'Active',notes:'Closed successfully.',address:'Islamabad',location_link:'',contact2_name:'',contact2_email:'',contact2_phone:'',assigned_to:'u3',created_by:'u3',rep:'Ali Khan',repInitials:'AK',repColor:'teal',manager_name:'Sales Manager',created_at:iso(-18),updated_at:iso(-4)},
      {id:'l4',company:'Digital Solutions PK',company_id:'c4',contact:'Hina Malik',email:'hina@digital.test',phone:'0304-1000004',product:'CRM Customization',value:12000,currency:'USD',stage:'New',priority:'Low',lead_status:'Active',notes:'Initial inquiry.',address:'Karachi',location_link:'',contact2_name:'',contact2_email:'',contact2_phone:'',assigned_to:'u3',created_by:'u3',rep:'Ali Khan',repInitials:'AK',repColor:'teal',manager_name:'Sales Manager',created_at:iso(-2),updated_at:iso(-2)}
    ],
    vendors: [
      {id:'v1',vendor_name:'CloudHost Demo',contact_person:'Usman',email:'usman@cloud.test',phone:'0305-1111111',contact2_person:'',contact2_email:'',contact2_phone:'',address:'Karachi',credit_terms:'30 Days',notes:'Demo vendor',status:'Active',categories:['Cloud','Hosting'],created_at:iso(-20),updated_at:iso(-2),created_by_name:'Admin User'},
      {id:'v2',vendor_name:'Tech Supplies Demo',contact_person:'Nadia',email:'nadia@tech.test',phone:'0306-2222222',contact2_person:'',contact2_email:'',contact2_phone:'',address:'Lahore',credit_terms:'15 Days',notes:'Hardware supplier',status:'Active',categories:['Hardware'],created_at:iso(-15),updated_at:iso(-3),created_by_name:'Quote Manager'}
    ],
    quotes: [
      {id:'q1',company_id:'c1',company_name:'Acme Technologies',quote_number:'QT-DEMO-001',currency:'USD',value:25000,due_date:iso(7).slice(0,10),status:'Sent',sent_date:iso(-1).slice(0,10),contact_person:'Ahmed Raza',contact_number:'0301-1000001',notes:'Demo quotation',salesperson_id:'u3',salesperson_name:'Ali Khan',created_by:'u4',created_by_name:'Quote Manager',attachment_filename:null,attachment_original_name:null,created_at:iso(-1),updated_at:iso(-1)},
      {id:'q2',company_id:'c2',company_name:'Blue Ocean Foods',quote_number:'QT-DEMO-002',currency:'PKR',value:450000,due_date:iso(14).slice(0,10),status:'Draft',sent_date:null,contact_person:'Sara Ahmed',contact_number:'0302-1000002',notes:'Draft demo quote',salesperson_id:'u3',salesperson_name:'Ali Khan',created_by:'u4',created_by_name:'Quote Manager',attachment_filename:null,attachment_original_name:null,created_at:iso(-3),updated_at:iso(-3)}
    ],
    reminders: [
      {id:'r1',lead_id:'l1',user_id:'u3',type:'Call',note:'Follow up on proposal',date:iso(0).slice(0,10),done:false,company:'Acme Technologies',rep_name:'Ali Khan',rep:'Ali Khan',repInitials:'AK',repColor:'teal',contact:'Ahmed Raza',created_at:iso(-1)},
      {id:'r2',lead_id:'l2',user_id:'u3',type:'Meeting',note:'Product demo',date:iso(2).slice(0,10),done:false,company:'Blue Ocean Foods',rep_name:'Ali Khan',rep:'Ali Khan',repInitials:'AK',repColor:'teal',contact:'Sara Ahmed',created_at:iso(-1)},
      {id:'r3',lead_id:'l3',user_id:'u3',type:'Email',note:'Send thank-you email',date:iso(-2).slice(0,10),done:true,company:'Crescent Industries',rep_name:'Ali Khan',rep:'Ali Khan',repInitials:'AK',repColor:'teal',contact:'Bilal Hussain',created_at:iso(-5)}
    ],
    activities: [
      {id:'a1',action:'Login',details:'Ali Khan signed in as sales',user_name:'Ali Khan',user_role:'sales',ip_address:'Demo Mode',lead_id:'',created_at:iso(-1)},
      {id:'a2',action:'Lead Added',details:'Added Acme Technologies',user_name:'Ali Khan',user_role:'sales',ip_address:'Demo Mode',lead_id:'l1',created_at:iso(-8)},
      {id:'a3',action:'Stage Changed',details:'Crescent Industries moved to Closed Won',user_name:'Ali Khan',user_role:'sales',ip_address:'Demo Mode',lead_id:'l3',created_at:iso(-4)}
    ],
    settings:{api_key:'DEMO-KEY-NOT-A-REAL-KEY',company_name:'Roshan Technologies',mode:'Demo Mode'},
    vendorCategories:['Cloud','Hosting','Hardware','Software','Networking','Consulting']
  };
}

function demoDB(){
  let db; try { db=JSON.parse(localStorage.getItem(DEMO_KEY)||'null'); } catch(e) { db=null; }
  if(!db){ db=demoSeed(); localStorage.setItem(DEMO_KEY,JSON.stringify(db)); }
  return db;
}
function saveDemoDB(db){ localStorage.setItem(DEMO_KEY,JSON.stringify(db)); }
function demoId(prefix){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function parseBody(options){
  const body=options&&options.body;
  if(body instanceof FormData){ const o={}; for(const [k,v] of body.entries()){ if(k==='attachment' && v instanceof File){ o._file=v; } else o[k]=v; } return o; }
  if(typeof body==='string'){ try{return JSON.parse(body)||{};}catch(e){return {};} }
  return body||{};
}
function roleUser(){ const s=getSession(); return s; }
function enrichLeadLocal(l){ const u=demoDB().users.find(x=>String(x.id)===String(l.assigned_to)); const r={...l}; r.rep=u?u.name:(l.rep||'Unknown'); r.repInitials=(r.rep||'??').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase(); r.repColor='teal'; r.manager_name=u&&u.manager_id?((demoDB().users.find(x=>x.id===u.manager_id)||{}).name||''): (l.manager_name||''); return r; }
function scopedLeads(db,u){ let arr=db.leads.map(enrichLeadLocal); if(u.role==='admin') return arr; if(u.role==='manager') return arr.filter(l=>{const rep=db.users.find(x=>String(x.id)===String(l.assigned_to));return rep&&String(rep.manager_id)===String(u.id);}); return arr.filter(l=>String(l.created_by||l.assigned_to)===String(u.id)); }
function scopedReminders(db,u){ if(u.role==='admin')return db.reminders; if(u.role==='manager')return db.reminders.filter(r=>String(r.user_id)===String(u.id)||String((db.users.find(x=>String(x.id)===String(r.user_id))||{}).manager_id)===String(u.id)); return db.reminders.filter(r=>String(r.user_id)===String(u.id)); }

async function apiFetch(url, options={}){
  const db=demoDB(), u=roleUser(), method=(options.method||'GET').toUpperCase(), path=String(url).replace(BASE_URL,'').split('?')[0];
  const id=path.split('/').filter(Boolean).pop();
  const body=parseBody(options);
  const ok=x=>Promise.resolve(x);
  if(path==='/login' && method==='POST'){
    const user=db.users.find(x=>x.email.toLowerCase()===String(body.email||'').toLowerCase() && x.password===body.password && x.status!=='Inactive');
    if(!user) throw new Error('Invalid email or password');
    return ok({id:user.id,name:user.name,role:user.role,email:user.email,token:'demo-token-'+user.id,manager_id:user.manager_id||null});
  }
  if(!u && path!=='/login') throw new Error('Unauthorized');
  if(path==='/leads' && method==='GET') return ok({leads:scopedLeads(db,u)});
  if(path==='/leads' && method==='POST'){
    const c=db.companies.find(x=>String(x.id)===String(body.company_id));
    const lead={...body,id:demoId('l'),company:body.company|| (c&&c.name)||'New Company',company_id:body.company_id||null,assigned_to:body.assigned_to||u.id,created_by:u.id,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),lead_status:body.lead_status||'Active',stage:body.stage||'New',priority:body.priority||'Medium',currency:body.currency||'USD',value:Number(body.value||0)};
    db.leads.unshift(enrichLeadLocal(lead)); saveDemoDB(db); return ok({success:true,lead:enrichLeadLocal(lead)});
  }
  if(path.startsWith('/leads/') && path.endsWith('/stage') && method==='POST'){ const lid=path.split('/')[2],l=db.leads.find(x=>String(x.id)===String(lid)); if(!l)throw new Error('Lead not found'); l.stage=body.stage;l.updated_at=new Date().toISOString();saveDemoDB(db);return ok({success:true}); }
  if(path.startsWith('/leads/') && method==='PUT'){ const lid=path.split('/')[2],l=db.leads.find(x=>String(x.id)===String(lid)); if(!l)throw new Error('Lead not found');Object.assign(l,body,{updated_at:new Date().toISOString()});saveDemoDB(db);return ok({success:true}); }
  if(path==='/companies' && method==='GET') return ok({companies:db.companies});
  if(path==='/companies/search' && method==='GET'){ const q=(url.split('?')[1]||'').replace(/^q=/,''); const term=decodeURIComponent(q).toLowerCase(); return ok({companies:db.companies.filter(c=>c.name.toLowerCase().includes(term)).slice(0,8)}); }
  if(path==='/companies' && method==='POST'){const name=String(body.name||'').trim();if(!name)throw new Error('Company name is required');const c={id:demoId('c'),name};db.companies.push(c);saveDemoDB(db);return ok({success:true,company:c});}
  if(path.startsWith('/companies/') && method==='GET'){const cid=path.split('/')[2],c=db.companies.find(x=>String(x.id)===String(cid));if(!c)throw new Error('Company not found');const leads=scopedLeads(db,u).filter(l=>String(l.company_id)===String(cid));const quotes=db.quotes.filter(q=>String(q.company_id)===String(cid));return ok({company:{id:c.id,name:c.name},own_leads:leads,other_leads_count:db.leads.filter(l=>String(l.company_id)===String(cid)).length-leads.length,lead_count:db.leads.filter(l=>String(l.company_id)===String(cid)).length,quotes});}
  if(path==='/quotes' && method==='GET') return u.role==='admin'||u.role==='quote_manager'?ok({quotes:db.quotes}):Promise.reject(new Error('Forbidden'));
  if(path==='/quotes' && method==='POST'){const q={...body,id:demoId('q'),company_id:body.company_id,company_name:(db.companies.find(c=>String(c.id)===String(body.company_id))||{}).name||'',quote_number:body.quote_number||('QT-'+Date.now()),currency:body.currency||'USD',value:Number(body.value||0),status:body.status||'Draft',created_by:u.id,created_by_name:u.name,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),salesperson_name:(db.users.find(x=>String(x.id)===String(body.salesperson_id))||{}).name||null}; if(body._file){const b=await body._file.arrayBuffer();q._attachment_b64=btoa(String.fromCharCode(...new Uint8Array(b)));q.attachment_original_name=body._file.name;q.attachment_filename=body._file.name;}db.quotes.unshift(q);saveDemoDB(db);return ok({success:true,quote:q});}
  if(path.startsWith('/quotes/') && method==='PUT'){const qid=path.split('/')[2],q=db.quotes.find(x=>String(x.id)===String(qid));if(!q)throw new Error('Quote not found');Object.assign(q,body,{updated_at:new Date().toISOString()});if(body._file){const b=await body._file.arrayBuffer();q._attachment_b64=btoa(String.fromCharCode(...new Uint8Array(b)));q.attachment_original_name=body._file.name;}saveDemoDB(db);return ok({success:true,quote:q});}
  if(path.startsWith('/quotes/') && method==='DELETE'){db.quotes=db.quotes.filter(q=>String(q.id)!==String(path.split('/')[2]));saveDemoDB(db);return ok({success:true});}
  if(path==='/vendors' && method==='GET') return (u.role==='admin'||u.role==='quote_manager')?ok({vendors:db.vendors}):Promise.reject(new Error('Forbidden'));
  if(path==='/vendors' && method==='POST'){const v={...body,id:demoId('v'),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),created_by_name:u.name,categories:Array.isArray(body.categories)?body.categories:[]};db.vendors.push(v);saveDemoDB(db);return ok({success:true,vendor:v});}
  if(path.startsWith('/vendors/') && method==='PUT'){const v=db.vendors.find(x=>String(x.id)===String(path.split('/')[2]));if(!v)throw new Error('Vendor not found');Object.assign(v,body,{updated_at:new Date().toISOString()});saveDemoDB(db);return ok({success:true,vendor:v});}
  if(path.startsWith('/vendors/') && method==='DELETE'){db.vendors=db.vendors.filter(x=>String(x.id)!==String(path.split('/')[2]));saveDemoDB(db);return ok({success:true});}
  if(path==='/vendor-categories')return ok({categories:db.vendorCategories});
  if(path==='/salespersons')return ok({salespersons:db.users.filter(x=>x.role==='sales'&&x.status==='Active').map(x=>({id:x.id,name:x.name}))});
  if(path==='/users'&&method==='GET')return ok({users:db.users.map(x=>{const y={...x};delete y.password;return y;})});
  if(path==='/users'&&method==='POST'){const nu={...body,id:demoId('u'),status:'Active',password:body.password||'password123'};db.users.push(nu);saveDemoDB(db);return ok({success:true});}
  if(path.startsWith('/users/')&&path.endsWith('/password')&&method==='POST'){const uid=path.split('/')[2],x=db.users.find(a=>String(a.id)===String(uid));if(!x)throw new Error('User not found');x.password=body.password;saveDemoDB(db);return ok({success:true});}
  if(path.startsWith('/users/')&&method==='PUT'){const uid=path.split('/')[2],x=db.users.find(a=>String(a.id)===String(uid));if(!x)throw new Error('User not found');Object.assign(x,body);saveDemoDB(db);return ok({success:true});}
  if(path==='/reminders'&&method==='GET')return ok({reminders:scopedReminders(db,u)});
  if(path==='/reminders'&&method==='POST'){const r={...body,id:demoId('r'),user_id:u.id,rep_name:u.name,rep:u.name,repInitials:u.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase(),done:false,created_at:new Date().toISOString()};db.reminders.push(r);saveDemoDB(db);return ok({success:true,id:r.id});}
  if(path.startsWith('/reminders/')&&method==='PUT'){const r=db.reminders.find(x=>String(x.id)===String(path.split('/')[2]));if(!r)throw new Error('Reminder not found');Object.assign(r,body);saveDemoDB(db);return ok({success:true});}
  if(path.startsWith('/reminders/')&&method==='DELETE'){db.reminders=db.reminders.filter(x=>String(x.id)!==String(path.split('/')[2]));saveDemoDB(db);return ok({success:true});}
  if(path==='/stats'){const leads=scopedLeads(db,u),active=leads.filter(l=>l.lead_status!=='Inactive'),closed=leads.filter(l=>l.stage==='Closed Won'),pb={USD:0,PKR:0};active.forEach(l=>pb[(l.currency||'USD').toUpperCase()]=(pb[(l.currency||'USD').toUpperCase()]||0)+Number(l.value||0));const reps={};leads.forEach(l=>{reps[l.rep]=reps[l.rep]||{name:l.rep,value:0,valueByCurrency:{USD:0,PKR:0},deals:0,leads:0,initials:l.repInitials};reps[l.rep].leads++;if(l.stage==='Closed Won'){reps[l.rep].value+=Number(l.value||0);reps[l.rep].valueByCurrency[l.currency]=(reps[l.rep].valueByCurrency[l.currency]||0)+Number(l.value||0);reps[l.rep].deals++;}});return ok({pipeline:active.reduce((a,l)=>a+Number(l.value||0),0),pipelineByCurrency:pb,closedCount:closed.length,conversionRate:leads.length?Math.round(closed.length/leads.length*100):0,activeLeads:leads.length,reps:Object.values(reps),stageBreakdown:{'New':leads.filter(l=>l.stage==='New').length,'Contact Made':leads.filter(l=>l.stage==='Contact Made').length,'Demo':leads.filter(l=>l.stage==='Demo').length,'Proposal Sent':leads.filter(l=>l.stage==='Proposal Sent').length,'Closed Won':closed.length},leads});}
  if(path==='/activities'&&method==='GET')return ok({activities:db.activities.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))});
  if(path==='/activities'&&method==='POST'){db.activities.unshift({...body,id:demoId('a'),created_at:new Date().toISOString()});saveDemoDB(db);return ok({success:true});}
  if(path==='/settings'&&method==='GET')return ok(db.settings);
  if(path==='/settings/regenerate-key'&&method==='POST'){db.settings.api_key='DEMO-'+Date.now();saveDemoDB(db);return ok({api_key:db.settings.api_key});}
  throw new Error('Demo endpoint not implemented: '+method+' '+path);
}

function apiHeaders(isFormData){ const s=getSession(); const headers={}; if(s)headers.Authorization='Bearer '+s.token; if(!isFormData)headers['Content-Type']='application/json'; return headers; }
async function getPublicIP(){ return 'Demo Mode'; }
function logActivity(action,details,ipOverride,leadId){ try{ const s=getSession(); const db=demoDB();db.activities.unshift({id:demoId('a'),action,details:details||'',user_name:s?s.name:'Unknown',user_role:s?s.role:'',ip_address:'Demo Mode',lead_id:leadId||'',created_at:new Date().toISOString()});saveDemoDB(db);}catch(e){} }
