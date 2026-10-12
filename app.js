const apiUrl = window.IOT_API_URL.replace(/\/$/, "");
const state = { token: sessionStorage.getItem("iot_token"), devices: [], map: null, markers: [] };
const $ = (id) => document.getElementById(id);

function showApp(loggedIn) {
  $("login-view").hidden = loggedIn;
  $("app-view").hidden = !loggedIn;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Nunca";
}

async function api(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}`, ...(options.headers || {}) },
  });
  if (response.status === 401) {
    sessionStorage.removeItem("iot_token");
    state.token = null;
    showApp(false);
    throw new Error("Sessao expirada");
  }
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function filteredDevices() {
  const region = $("region-filter").value;
  const status = $("status-filter").value;
  return state.devices.filter((device) => (region === "all" || device.region === region) && (status === "all" || (status === "online" ? device.online : !device.online)));
}

function render() {
  const devices = filteredDevices();
  const online = state.devices.filter((device) => device.online).length;
  $("summary").innerHTML = `<div><strong>${online}</strong><span>ativos</span></div><div><strong>${state.devices.length - online}</strong><span>offline</span></div><div><strong>${state.devices.length}</strong><span>dispositivos</span></div>`;
  $("device-list").innerHTML = devices.map((device) => {
    const data = device.data || {};
    return `<article class="device-card ${device.online ? "is-online" : "is-offline"}"><div class="card-head"><span class="dot"></span><h2>${device.name}</h2></div><p class="muted">${device.region} · ${device.id}</p><div class="reading"><strong>${data.temperature_c ?? "--"}°C</strong><span>${data.humidity ?? "--"}% umidade</span></div><p class="muted">Ultimo dado: ${formatDate(device.last_seen)}</p></article>`;
  }).join("");
  state.markers.forEach((marker) => marker.remove());
  state.markers = devices.map((device) => {
    const marker = L.circleMarker([device.latitude, device.longitude], { radius: 10, color: device.online ? "#32d583" : "#ff5c73", fillColor: device.online ? "#32d583" : "#ff5c73", fillOpacity: 0.9, weight: 3 }).addTo(state.map);
    const data = device.data || {};
    marker.bindPopup(`<strong>${device.name}</strong><br>${device.online ? "Ativo" : "Offline"}<br>Temperatura: ${data.temperature_c ?? "N/D"} °C<br>Umidade: ${data.humidity ?? "N/D"}%<br>Ultimo timestamp: ${formatDate(device.last_seen)}`);
    return marker;
  });
}

async function loadStatus() {
  const payload = await api("/api/iot/status");
  state.devices = payload.devices;
  const regions = [...new Set(state.devices.map((device) => device.region))].sort();
  $("region-filter").innerHTML = `<option value="all">Todas</option>${regions.map((region) => `<option>${region}</option>`).join("")}`;
  $("updated-at").textContent = `Atualizado ${formatDate(payload.generated_at)}`;
  render();
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("login-error").textContent = "";
  const body = Object.fromEntries(new FormData(event.target));
  try {
    const response = await fetch(`${apiUrl}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("Usuario ou senha invalidos");
    state.token = (await response.json()).access_token;
    sessionStorage.setItem("iot_token", state.token);
    showApp(true);
    await loadStatus();
  } catch (error) { $("login-error").textContent = error.message; }
});

$("logout").addEventListener("click", () => { sessionStorage.removeItem("iot_token"); state.token = null; showApp(false); });
$("refresh").addEventListener("click", () => loadStatus().catch((error) => { $("updated-at").textContent = error.message; }));
$("region-filter").addEventListener("change", render);
$("status-filter").addEventListener("change", render);

state.map = L.map("map").setView([-10.2, -52.0], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(state.map);
if (state.token) { showApp(true); loadStatus().catch(() => showApp(false)); }
