const token = sessionStorage.getItem("token");
const authHeaders = { "Authorization": "Bearer " + token };
const $ = (id) => document.getElementById(id);
let flats = [];
let tenants = [];

if (!token || JSON.parse(sessionStorage.getItem("user") || "null")?.role !== "owner") {
    window.location.href = "/";
}

$("logoutButton").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "/";
});

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...authHeaders, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
}
function showMessage(id, text, isError = false) {
    $(id).textContent = text;
    $(id).className = "message " + (isError ? "error" : "success");
}
function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value == null || value === "" ? "-" : value;
    row.appendChild(cell);
}
async function loadFlats() {
    try {
        flats = await api("/api/flats");
        const body = $("flatsTableBody");
        body.replaceChildren();
        if (!flats.length) { body.innerHTML = '<tr><td colspan="6">No flats added yet.</td></tr>'; }
        flats.forEach(flat => {
            const row = document.createElement("tr");
            addCell(row, flat.flat_number); addCell(row, flat.building_name);
            addCell(row, "₹" + Number(flat.monthly_rent).toLocaleString("en-IN"));
            addCell(row, flat.tenant_id ? "Occupied" : "Available");
            addCell(row, flat.tenant_name || "—");
            const cell = document.createElement("td");
            if (flat.tenant_id) {
                const btn = document.createElement("button"); btn.textContent = "Vacate";
                btn.className = "secondary";
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove the tenant assignment for flat " + flat.flat_number + "?")) return;
                    try { const result = await api(`/api/assignments/${flat.id}`, { method: "DELETE" }); showMessage("assignmentMessage", result.message); await refresh(); }
                    catch (e) { showMessage("assignmentMessage", e.message, true); }
                });
                cell.appendChild(btn);
            } else {
                const btn = document.createElement("button"); btn.textContent = "Edit"; btn.className = "secondary";
                btn.addEventListener("click", async () => {
                    const number = prompt("Flat number:", flat.flat_number); if (number === null) return;
                    const building = prompt("Building name:", flat.building_name || ""); if (building === null) return;
                    const rent = Number(prompt("Monthly rent:", flat.monthly_rent)); if (!number.trim() || !Number.isFinite(rent) || rent <= 0) { alert("Enter valid flat details."); return; }
                    try { await api(`/api/flats/${flat.id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({flat_number:number.trim(), building_name:building.trim(), monthly_rent:rent}) }); await refresh(); }
                    catch (e) { alert(e.message); }
                });
                cell.appendChild(btn);
            }
            row.appendChild(cell); body.appendChild(row);
        });
        const select = $("assignmentFlat"); select.replaceChildren(new Option("Choose available flat", ""));
        flats.filter(f => !f.tenant_id).forEach(f => select.add(new Option(`${f.flat_number} — ₹${f.monthly_rent}`, f.id)));
        showMessage("flatsMessage", `${flats.length} flat(s) loaded.`);
    } catch (e) { showMessage("flatsMessage", e.message, true); }
}
async function loadTenants() {
    try {
        tenants = await api("/api/tenants");
        const body = $("tenantsTableBody"); body.replaceChildren();
        if (!tenants.length) body.innerHTML = '<tr><td colspan="3">No registered tenants.</td></tr>';
        tenants.forEach(t => {
            const row = document.createElement("tr");
            addCell(row,t.name); addCell(row,t.email);
            addCell(row,t.flat_number ? `${t.flat_number}${t.building_name ? " ("+t.building_name+")" : ""}` : "Not assigned");
            body.appendChild(row);
        });
        for (const id of ["assignmentTenant","rentTenant"]) {
            const select = $(id); select.replaceChildren(new Option("Choose tenant",""));
            tenants.forEach(t => select.add(new Option(`${t.name} (${t.email})`,t.id)));
        }
        showMessage("tenantsMessage", `${tenants.length} tenant(s) loaded.`);
    } catch (e) { showMessage("tenantsMessage",e.message,true); }
}
$("addFlatForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const result = await api("/api/flats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
            flat_number:$("flatNumber").value.trim(),building_name:$("buildingName").value.trim(),monthly_rent:Number($("monthlyRent").value)
        })});
        showMessage("addFlatMessage",result.message); $("addFlatForm").reset(); await refresh();
    } catch(err) { showMessage("addFlatMessage",err.message,true); }
});
$("assignmentForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const result = await api("/api/assignments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenant_id:Number($("assignmentTenant").value),flat_id:Number($("assignmentFlat").value)})});
        showMessage("assignmentMessage",result.message); $("assignmentForm").reset(); await refresh();
    } catch(err) { showMessage("assignmentMessage",err.message,true); }
});
$("rentYear").value = new Date().getFullYear();
$("rentMonth").value = String(new Date().getMonth()+1);
$("rentForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const result = await api("/api/rent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
            tenant_id:Number($("rentTenant").value),amount:Number($("rentAmount").value),
            period_month:Number($("rentMonth").value),period_year:Number($("rentYear").value),notes:$("rentNotes").value.trim()
        })});
        showMessage("rentMessage",result.message); $("rentForm").reset(); $("rentYear").value=new Date().getFullYear(); $("rentMonth").value=String(new Date().getMonth()+1);
        await loadRent();
    } catch(err) { showMessage("rentMessage",err.message,true); }
});
async function loadRent() {
    try {
        const rows = await api("/api/rent"); const body=$("rentTableBody"); body.replaceChildren();
        rows.forEach(p => { const row=document.createElement("tr"); addCell(row,p.tenant_name); addCell(row,p.flat_number);
            addCell(row,`${p.period_year}-${String(p.period_month).padStart(2,"0")}`); addCell(row,"₹"+p.amount); addCell(row,String(p.payment_date).slice(0,10)); body.appendChild(row); });
        if (!rows.length) body.innerHTML='<tr><td colspan="5">No payments recorded yet.</td></tr>';
    } catch(e) { showMessage("rentMessage",e.message,true); }
}
$("noticeForm").addEventListener("submit", async e => {
    e.preventDefault(); try { const r=await api("/api/notices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:$("noticeTitle").value.trim(),message:$("noticeText").value.trim()})}); showMessage("noticeMessage",r.message); $("noticeForm").reset(); }
    catch(err) { showMessage("noticeMessage",err.message,true); }
});
$("utilityForm").addEventListener("submit", async e => {
    e.preventDefault(); try { const r=await api("/api/utilities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({utility_type:$("utilityType").value,message:$("utilityText").value.trim()})}); showMessage("utilityMessage",r.message); $("utilityForm").reset(); }
    catch(err) { showMessage("utilityMessage",err.message,true); }
});
async function loadMaintenance() {
    try {
        const rows=await api("/api/maintenance"); const body=$("maintenanceTableBody"); body.replaceChildren();
        if (!rows.length) { body.innerHTML='<tr><td colspan="6">No maintenance requests yet.</td></tr>'; return; }
        rows.forEach(m => {
            const row=document.createElement("tr"); addCell(row,m.tenant_name); addCell(row,m.flat_number); addCell(row,m.subject); addCell(row,m.description);
            const statusCell=document.createElement("td"); const select=document.createElement("select");
            ["Open","In Progress","Resolved","Rejected"].forEach(s=>select.add(new Option(s,s)));
            select.value=m.status; statusCell.appendChild(select); row.appendChild(statusCell);
            const actionCell=document.createElement("td"); const btn=document.createElement("button"); btn.textContent="Save"; btn.className="secondary";
            btn.addEventListener("click",async()=>{try{await api(`/api/maintenance/${m.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:select.value})});showMessage("maintenanceMessage","Request status updated.");}catch(e){showMessage("maintenanceMessage",e.message,true);}});
            actionCell.appendChild(btn);row.appendChild(actionCell);body.appendChild(row);
        });
    } catch(e) { showMessage("maintenanceMessage",e.message,true); }
}
async function refresh() { await Promise.all([loadFlats(),loadTenants(),loadRent(),loadMaintenance()]); }
refresh();
