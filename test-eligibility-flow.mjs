const sp = new URLSearchParams("type=Individual&from=India&dest=United+Arab+Emirates&dep=2026-08-01&ret=2026-09-14&adults=1&children=0&dob=1980-01-21");
const dep = sp.get('dep'), ret = sp.get('ret'), dob = sp.get('dob'), dest = sp.get('dest');

async function mapWithConcurrency(items, limit, fn) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const res = await fetch(`http://localhost:3001/api/insurance/plans?${sp.toString()}`);
const data = await res.json();
const loadedPlans = data.plans ?? [];
console.log("loaded plans:", loadedPlans.length);

const eligible = [];
const t0 = Date.now();
await mapWithConcurrency(loadedPlans, 4, async plan => {
  try {
    const qs = new URLSearchParams({ plan: plan.name, dep, ret, dob, dest }).toString();
    const r = await fetch(`http://localhost:3001/api/insurance/premium?${qs}`);
    if (!r.ok) { console.log("FAIL", plan.name, r.status); return; }
    const real = await r.json();
    if (!real.totalPremium) { console.log("NOT ELIGIBLE", plan.name); return; }
    eligible.push({ ...plan, premium: Math.round(real.totalPremium) });
  } catch (e) {
    console.log("EXC", plan.name, e.message);
  }
});
console.log("elapsed ms:", Date.now() - t0);
console.log("eligible count:", eligible.length);
console.log(eligible.slice(0, 5));
