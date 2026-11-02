const token=sessionStorage.getItem("token");
const user=JSON.parse(sessionStorage.getItem("user")||"null");
const $=id=>document.getElementById(id);
if(!token||user?.role!=="tenant") window.location.href="/";
$("tenantWelcome").textContent=`Welcome, ${user?.name||"Tenant"}. Here are your apartment updates.`;
$("logoutButton").addEventListener("click",()=>{sessionStorage.clear();window.location.href="/";});
async function api(url,options={}) {
 const r=await fetch(url,{...options,headers:{"Authorization":"Bearer "+token,...(options.headers||{})}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error(data.message||"Request failed.");
 return data;
}
function cell(row,value){const td=document.createElement("td");td.textContent=value??"-";row.appendChild(td);}
function itemCard(title,body,date){const article=document.createElement("article");article.className="feed-item";const h=document.createElement("h3");h.textContent=title;const p=document.createElement("p");p.textContent=body;article.append(h,p);if(date){const small=document.createElement("small");small.textContent=String(date).slice(0,16).replace("T"," ");article.appendChild(small);}return article;}
async function loadDashboard(){
 try{
  const d=await api("/api/tenant/dashboard");
  if(d.flat){$("myFlat").replaceChildren(itemCard(`Flat ${d.flat.flat_number}`,`${d.flat.building_name||"Apartment"} · Monthly rent ₹${Number(d.flat.monthly_rent).toLocaleString("en-IN")} · ${d.flat.status}`));}
  else {$("myFlat").textContent="No flat has been assigned to your account yet.";}
  const notices=$("noticesList");notices.replaceChildren();
  if(!d.notices.length) notices.textContent="No notices currently.";
  d.notices.forEach(n=>notices.appendChild(itemCard(n.title,n.message,n.created_at)));
  const utilities=$("utilitiesList");utilities.replaceChildren();
  if(!d.utilities.length) utilities.textContent="No utility updates currently.";
  d.utilities.forEach(u=>utilities.appendChild(itemCard(u.utility_type.toUpperCase(),u.message,u.created_at)));
  const rent=$("rentHistory");rent.replaceChildren();
  d.rentPayments.forEach(p=>{const row=document.createElement("tr");cell(row,`${p.period_year}-${String(p.period_month).padStart(2,"0")}`);cell(row,"₹"+p.amount);cell(row,String(p.payment_date).slice(0,10));cell(row,p.notes||"—");rent.appendChild(row);});
  if(!d.rentPayments.length)rent.innerHTML='<tr><td colspan="4">No rent payments recorded yet.</td></tr>';
  const requests=$("myRequests");requests.replaceChildren();
d.requests.forEach(m=>{
    const row = document.createElement("tr");
    cell(row, m.title);
    cell(row, m.description);
    cell(row, m.status);
    cell(row, String(m.created_at).slice(0, 10));
    requests.appendChild(row);
});
}catch(e){$("flatMessage").textContent=e.message;}
}
$("maintenanceForm").addEventListener("submit",async e=>{
 e.preventDefault();
 try{const r=await api("/api/maintenance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:$("requestSubject").value.trim(),description:$("requestDescription").value.trim()})});$("requestMessage").textContent=r.message;$("requestMessage").className="message success";$("maintenanceForm").reset();await loadDashboard();}
 catch(err){$("requestMessage").textContent=err.message;$("requestMessage").className="message error";}
});
loadDashboard();
