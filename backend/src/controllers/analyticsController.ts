import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSnapshot, views } from '../services/queryService.js';
import { computeDashboard, computeImpact } from '../services/impactEngine.js';

export const analyticsRouter = Router();

const snapshotForImpact = async () => {
  const s = await getSnapshot();
  return {
    demands: s.demands,
    offers: s.offers,
    matches: s.matches,
    matchItems: s.matchItems,
    operations: s.operations,
    transportOrders: s.transportOrders,
    anomalies: s.anomalies,
    producers: s.producers,
  };
};

analyticsRouter.get('/analytics/dashboard', requireAuth, async (_req, res, next) => {
  try {
    res.json(computeDashboard(await snapshotForImpact()));
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get('/analytics/impact', requireAuth, async (_req, res, next) => {
  try {
    res.json(computeImpact(await snapshotForImpact()));
  } catch (e) {
    next(e);
  }
});

/** Resumen por rol para el dashboard personal. */
analyticsRouter.get('/analytics/me', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    if (a.profile.role === 'producer') {
      const demands = v.s.demands.filter((d) => d.producer_id === a.producer?.id);
      const demandIds = new Set(demands.map((d) => d.id));
      const matches = v.s.matches.filter((m) => demandIds.has(m.demand_id) && m.status !== 'CANCELLED');
      const active = demands.filter((d) => !['COMPLETED', 'CANCELLED'].includes(d.status)).sort((x, y) => y.created_at.localeCompare(x.created_at))[0] ?? null;
      const activeMatch = active ? matches.filter((m) => m.demand_id === active.id).sort((x, y) => y.created_at.localeCompare(x.created_at))[0] ?? null : null;
      const ops = v.s.operations.filter((o) => o.producer_id === a.producer?.id);
      const activeOp = activeMatch ? ops.find((o) => o.match_id === activeMatch.id) ?? null : null;
      return res.json({
        role: 'producer',
        activeDemand: active ? v.demand(active) : null,
        activeMatch: activeMatch ? v.match(activeMatch) : null,
        activeOperation: activeOp ? v.operation(activeOp) : null,
        totals: {
          demands: demands.length,
          litersRequested: demands.reduce((s, d) => s + d.requested_liters, 0),
          litersMatched: matches.filter((m) => m.status === 'CONFIRMED').reduce((s, m) => s + m.total_liters, 0),
          savings: Math.round(matches.filter((m) => m.status === 'CONFIRMED').reduce((s, m) => s + m.estimated_savings, 0)),
          operations: ops.length,
        },
      });
    }
    if (a.profile.role === 'supplier') {
      const offers = v.s.offers.filter((o) => o.supplier_id === a.supplier?.id);
      const activeOffers = offers.filter((o) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status));
      const offerIds = new Set(offers.map((o) => o.id));
      const items = v.s.matchItems.filter((it) => offerIds.has(it.offer_id));
      const confirmedMatchIds = new Set(v.s.matches.filter((m) => m.status === 'CONFIRMED').map((m) => m.id));
      const placed = items.filter((it) => confirmedMatchIds.has(it.match_id)).reduce((s, it) => s + it.allocated_liters, 0);
      const compatible = v.s.demands.filter((d) => ['OPEN', 'PARTIALLY_MATCHED'].includes(d.status) && d.remaining_liters > 0).length;
      const ops = v.s.operations.filter((o) => {
        const m = v.s.matches.find((mm) => mm.id === o.match_id);
        return m && items.some((it) => it.match_id === m.id);
      });
      return res.json({
        role: 'supplier',
        totals: {
          litersAvailable: activeOffers.reduce((s, o) => s + o.remaining_liters, 0),
          activeOffers: activeOffers.length,
          compatibleDemands: compatible,
          operations: ops.length,
          litersPlaced: placed,
          revenue: Math.round(items.filter((it) => confirmedMatchIds.has(it.match_id)).reduce((s, it) => s + it.subtotal, 0)),
        },
      });
    }
    if (a.profile.role === 'carrier') {
      const orders = v.s.transportOrders.filter((t) => t.carrier_id === a.carrier?.id);
      return res.json({
        role: 'carrier',
        totals: {
          assigned: orders.filter((t) => t.status === 'ASSIGNED').length,
          inTransit: orders.filter((t) => t.status === 'IN_TRANSIT').length,
          delivered: orders.filter((t) => t.status === 'DELIVERED').length,
          pendingNearby: v.s.transportOrders.filter((t) => t.status === 'PENDING').length,
          litersMoved: orders.filter((t) => t.status === 'DELIVERED').reduce((s, t) => s + t.liters, 0),
          kmDriven: Math.round(orders.filter((t) => t.status === 'DELIVERED').reduce((s, t) => s + t.distance_km, 0)),
        },
      });
    }
    return res.json({ role: 'admin', totals: computeDashboard(await snapshotForImpact()).cards });
  } catch (e) {
    next(e);
  }
});
