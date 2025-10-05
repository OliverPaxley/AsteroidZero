// src/lib/impact.js
const J_PER_MT = 4.184e15; // joules per megaton

export function energyMegatons(diameter_m, relVel_kms, density = 3000) {
  const r = diameter_m / 2;
  const volume = (4/3) * Math.PI * r**3;
  const mass = density * volume;
  const v = relVel_kms * 1000;
  const joules = 0.5 * mass * v**2;
  return joules / J_PER_MT;
}

export function radiusKmFromEnergyMt(E_mt, k = 0.012) {
  return k * Math.cbrt(E_mt);
}
