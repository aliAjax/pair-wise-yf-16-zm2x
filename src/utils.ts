import type {
  Accessory,
  Binding,
  IntakeSnapshot,
  Order,
  ServiceSpec,
} from "./types";

export function fmtDateTime(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function fmtTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function currentSpec(order: Order): ServiceSpec {
  const v = order.specVersions[order.specVersions.length - 1];
  return {
    edgeAngle: v.edgeAngle,
    wax: v.wax,
    repair: v.repair,
    preference: v.preference,
  };
}

export function validVerification(order: Order) {
  return [...order.verifications].reverse().find((v) => v.valid && v.passed);
}

/** 比对刃角/蜡型/修补是否发生变化（客户偏好变化不影响核验有效性） */
export function specChanged(a: ServiceSpec, b: ServiceSpec): boolean {
  return (
    a.edgeAngle.trim() !== b.edgeAngle.trim() ||
    a.wax.trim() !== b.wax.trim() ||
    a.repair.trim() !== b.repair.trim()
  );
}

export function changedFields(
  prev: ServiceSpec,
  next: ServiceSpec
): Array<{ label: string; from: string; to: string }> {
  const rows: Array<{ label: string; from: string; to: string }> = [];
  if (prev.edgeAngle.trim() !== next.edgeAngle.trim())
    rows.push({ label: "刃角", from: prev.edgeAngle, to: next.edgeAngle });
  if (prev.wax.trim() !== next.wax.trim())
    rows.push({ label: "打蜡类型", from: prev.wax, to: next.wax });
  if (prev.repair.trim() !== next.repair.trim())
    rows.push({ label: "底板修补", from: prev.repair, to: next.repair });
  return rows;
}

/** 固定器编号是否与收板快照一致 */
export function checkBindings(intake: IntakeSnapshot, now: Binding[]): boolean {
  if (now.length !== intake.bindings.length) return false;
  return intake.bindings.every((b) =>
    now.some((n) => n.no.trim() === b.no.trim() && n.position.trim() === b.position.trim())
  );
}

/** 附件齐套：逐项数量都满足收板登记 */
export function checkAccessories(
  intake: IntakeSnapshot,
  present: Accessory[]
): { ok: boolean; missing: Accessory[] } {
  const missing: Accessory[] = [];
  for (const item of intake.accessories) {
    const got =
      present.find((p) => p.name.trim() === item.name.trim())?.qty ?? 0;
    if (got < item.qty) {
      missing.push({ name: item.name, qty: item.qty - got });
    }
  }
  // 收板时未登记却多出来的附件，也列出供核对（标记数量为负不合适，这里只关注缺项）
  return { ok: missing.length === 0, missing };
}

export function accessoryText(list: Accessory[]): string {
  if (list.length === 0) return "无";
  return list.map((a) => `${a.name} ×${a.qty}`).join("、");
}
