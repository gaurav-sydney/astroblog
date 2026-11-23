// Which gates a change runs. Used by tests/run.mjs and asserted by the pipeline gate, so CI and its test share one rule.
import { CONFIG } from "./config.mjs";

// dist rebuilds dist/, so it runs before every gate that reads dist/.
export const ORDER = ["hygiene", "dist", "contract", "pipeline", "content", "brand", "rendered", "chat", "newsletter"];

/** The change types that a list of changed files sets. Files under dist/ alone set none: the dist gate covers them. */
export function typesFor(changed, config = CONFIG) {
  const src = changed.filter((f) => !f.startsWith(`${config.build.out}/`));
  return config.change_types.filter((ct) => src.some((f) => ct.paths.some((p) => f.startsWith(p)))).map((ct) => ct.type);
}

/** The ordered gate plan for change types (plus the baseline), or for every gate. */
export function planFor(types, { all = false, config = CONFIG } = {}) {
  const gates = new Set(config.baseline_gates);
  if (all) ORDER.forEach((g) => gates.add(g));
  for (const t of types) {
    const ct = config.change_types.find((c) => c.type === t);
    if (!ct) throw new Error(`unknown change type ${t}`);
    ct.gates.forEach((g) => gates.add(g));
  }
  return ORDER.filter((g) => gates.has(g));
}
