/**
 * Verificación end-to-end del flujo principal de demo contra la API en memoria.
 *   npm run test:flow
 */
import { createApp } from '../app.js';
import type { AddressInfo } from 'node:net';

process.env.FORCE_MEMORY_STORE = process.env.FORCE_MEMORY_STORE ?? 'true';

const app = createApp();
const server = app.listen(0);
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}/api`;

let failures = 0;
const check = (cond: boolean, label: string) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}`);
  if (!cond) failures++;
};

async function api<T = any>(path: string, opts: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json as T;
}

const login = async (role: string) => (await api<{ token: string }>('/auth/demo-login', { method: 'POST', body: { role } })).token;

try {
  console.log('\nDieselP2P — flujo de demo\n');
  const producer = await login('producer');
  const admin = await login('admin');
  const carrier = await login('carrier');

  const before = await api('/analytics/dashboard', { token: admin });

  console.log('PASO 1 · Productor crea demanda de 10.000 L (Santa Cruz, 2026-09-20)');
  const created = await api('/demands', {
    method: 'POST',
    token: producer,
    body: { requested_liters: 10000, target_price: 19.3, required_date: '2026-09-20', location_name: 'Santa Cruz de la Sierra', latitude: -17.7833, longitude: -63.1821, activity_type: 'Agricultura' },
  });
  check(created.demand.status === 'OPEN', `demanda creada ${created.demand.id.slice(0, 8)} (${created.anomalies.length} anomalías)`);

  console.log('PASO 2-3 · Motor de matching');
  const result = await api('/matching/find', { method: 'POST', token: producer, body: { demand_id: created.demand.id } });
  const m = result.match;
  const liters = m.items.map((it: any) => it.allocated_liters).sort((a: number, b: number) => b - a);
  console.log(`    analizadas ${result.analyzedOffers} ofertas, ${result.feasibleOffers} viables, ${result.alternatives.length} alternativas`);
  console.log(`    combinación: ${m.items.map((it: any) => `${it.supplier.business_name} → ${it.allocated_liters} L (${it.distance_km} km, Bs ${it.price_per_liter}/L)`).join(' + ')}`);
  console.log(`    score ${m.score}/100 → ${JSON.stringify(m.score_breakdown)}`);
  console.log(`    combustible Bs ${m.total_fuel_cost} · transporte Bs ${m.estimated_transport_cost} · total Bs ${m.estimated_total_cost} · referencia Bs ${m.reference_cost} · ahorro Bs ${m.estimated_savings} (${m.savings_percent}%)`);
  check(m.total_liters === 10000, 'cubre 10.000 L');
  check(liters[0] === 7000 && liters[1] === 3000, 'combinación 7.000 + 3.000');
  check(m.score >= 90, `score ${m.score} >= 90`);
  check(m.estimated_savings > 0, 'ahorro estimado positivo');

  console.log('PASO 5-6 · Confirmar match → operación → transportista');
  const op = await api(`/matches/${m.id}/confirm`, { method: 'POST', token: producer });
  check(/^D2P-2026-\d{6}$/.test(op.operation_code), `operación ${op.operation_code} creada (${op.status})`);
  check(op.transports.length === 2, 'dos órdenes de transporte (una por proveedor)');
  const carriers = await api('/carriers', { token: producer });
  const oriente = carriers.find((c: any) => c.company_name === 'Logística Oriente');
  const assigned = await api('/transport', { method: 'POST', token: producer, body: { match_id: m.id, carrier_id: oriente.id } });
  check(assigned.status === 'ASSIGNED' && assigned.carrier?.company_name === 'Logística Oriente', 'transportista Logística Oriente ASIGNADO');

  const mine = await api('/transport', { token: carrier });
  const myOrders = mine.filter((t: any) => t.match_id === m.id);
  for (const t of myOrders) await api(`/transport/${t.id}/status`, { method: 'PATCH', token: carrier, body: { status: 'IN_TRANSIT' } });
  const opNow = await api(`/operations/${op.id}`, { token: producer });
  check(opNow.status === 'IN_TRANSIT', `operación en tránsito (${opNow.status})`);
  const verify = await api(`/operations/verify/${op.qr_token}`);
  check(verify.suppliers.length === 2 && verify.total_liters === 10000, 'verificación pública por QR');


  console.log('PASO 7 · Dashboard admin');
  const after = await api('/analytics/dashboard', { token: admin });
  check(after.cards.litersConnected === before.cards.litersConnected + 10000, `litros conectados ${before.cards.litersConnected} → ${after.cards.litersConnected}`);
  check(after.cards.operations === before.cards.operations + 1, `operaciones ${before.cards.operations} → ${after.cards.operations}`);
  check(after.cards.estimatedSavings > before.cards.estimatedSavings, `ahorro estimado Bs ${before.cards.estimatedSavings} → Bs ${after.cards.estimatedSavings}`);
  const impact = await api('/analytics/impact', { token: admin });
  console.log(`    impacto: ${impact.litersOptimized} L · ${impact.producersBenefited} productores · ${impact.kmOptimized} km · Bs ${impact.totalSavings}`);

  console.log('SIMULACIÓN DE PASOS · el productor recorre el ciclo sin cambiar de usuario');
  const demand2 = await api('/demands', {
    method: 'POST',
    token: producer,
    body: { requested_liters: 4000, target_price: 19.8, required_date: '2026-09-22', location_name: 'Cotoca', latitude: -17.75, longitude: -62.9833, activity_type: 'Agricultura' },
  });
  const match2 = (await api('/matching/find', { method: 'POST', token: producer, body: { demand_id: demand2.demand.id } })).match;
  const op2 = await api(`/matches/${match2.id}/confirm`, { method: 'POST', token: producer });
  const states: string[] = [];
  for (let i = 0; i < 4; i++) {
    const detail = await api(`/operations/${op2.id}`, { token: producer });
    if (!detail.next_step?.action) break;
    const next = await api(`/operations/${op2.id}/simulate-next`, { method: 'POST', token: producer });
    states.push(next.status);
  }
  console.log(`    ${op2.operation_code}: CREATED → ${states.join(' → ')}`);
  check(states.join(',') === 'ASSIGNED,IN_TRANSIT,DELIVERED', 'el productor avanza la operación hasta ENTREGADA');
  const finalDemand = await api(`/demands/${demand2.demand.id}`, { token: producer });
  check(finalDemand.status === 'COMPLETED', `demanda cerrada como COMPLETED (${finalDemand.status})`);

  console.log('CASO ALTERNATIVO · Agro Cotoca 10.000 L → 5.000 + 3.000 + 2.000');
  const demands = await api('/demands', { token: admin });
  const alt = demands.find((d: any) => d.producer?.organization_name === 'Agro Cotoca' && d.status === 'OPEN');
  const altRes = await api('/matching/find', { method: 'POST', token: admin, body: { demand_id: alt.id } });
  const altLiters = altRes.match.items.map((it: any) => it.allocated_liters).sort((a: number, b: number) => b - a);
  console.log(`    combinación: ${altLiters.join(' + ')} · score ${altRes.match.score}`);
  check(altLiters.join('+') === '5000+3000+2000', 'combinación 5.000 + 3.000 + 2.000');

  console.log('ANOMALÍAS');
  const anomalies = await api('/anomalies', { token: admin });
  check(anomalies.length >= 5 && anomalies[0].risk_score >= 80, `${anomalies.length} eventos, máximo risk score ${anomalies[0].risk_score}`);

  console.log(`\n${failures === 0 ? 'FLUJO DE DEMO OK' : `${failures} verificaciones fallaron`}\n`);
} catch (e) {
  failures++;
  console.error('\nERROR:', e);
} finally {
  server.close();
  process.exit(failures ? 1 : 0);
}
