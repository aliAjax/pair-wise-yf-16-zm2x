import type {
  Accessory,
  CheckDraft,
  CheckSnapshot,
  DeliverySnapshot,
  MissingItem,
  NewOrderDraft,
  Order,
  OrderStatus,
  PickupAttempt,
  PickupForm,
  RepairSpec,
  TimelineEvent,
} from "./types";

export const STORAGE_KEY = "ski-check-desk:v1";

export const BOARD_TYPES = ["全地域", "公园板", "竞速板", "粉雪板"] as const;
export const WAX_TYPES = ["低温蜡", "全温蜡", "高温蜡", "氟素竞技蜡", "暂不打蜡"] as const;
export const CONFIRM_METHODS = ["现场签字", "拍照存证", "工单签名", "微信确认"] as const;
export const ACCESSORY_SUGGESTIONS = [
  "附件袋",
  "滑雪杖",
  "雪板包",
  "备用螺丝",
  "止滑贴",
  "脚垫",
  "工具",
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; hint: string; tone: "blue" | "amber" | "teal" | "green" }
> = {
  repairing: { label: "维修中", hint: "正在维修，最近一次核对有效", tone: "blue" },
  recheck: { label: "待复核", hint: "刃角/蜡型/修补有变化，先前核对已作废", tone: "amber" },
  ready: { label: "待取板", hint: "完工已通知取板，等待核验交付", tone: "teal" },
  delivered: { label: "已交付", hint: "取板核验通过，客户确认后交付", tone: "green" },
};

export const EMPTY_SPEC: RepairSpec = {
  edgeSide: "",
  edgeBase: "",
  waxType: "",
  repairNote: "",
};

export function nowISO(): string {
  return new Date().toISOString();
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function latestCheck(order: Order): CheckSnapshot | undefined {
  return order.checks.length ? order.checks[order.checks.length - 1] : undefined;
}

export function validCheck(order: Order): CheckSnapshot | undefined {
  for (let i = order.checks.length - 1; i >= 0; i--) {
    if (!order.checks[i].voided) return order.checks[i];
  }
  return undefined;
}

export function specDiff(before: RepairSpec, after: RepairSpec): string[] {
  const rows: Array<[string, string, string]> = [
    ["侧刃角", before.edgeSide, after.edgeSide],
    ["底刃角", before.edgeBase, after.edgeBase],
    ["蜡型", before.waxType, after.waxType],
    ["修补说明", before.repairNote, after.repairNote],
  ];
  return rows
    .filter(([, oldV, newV]) => normalize(oldV) !== normalize(newV))
    .map(([label, oldV, newV]) => `${label}：${oldV || "未填"} → ${newV || "未填"}`);
}

export function evaluatePickup(form: PickupForm, check: CheckSnapshot) {
  const missing: MissingItem[] = [];

  if (normalize(form.actualBinding) !== normalize(check.bindingSerial)) {
    missing.push({
      kind: "binding",
      label: "固定器编号不符",
      expected: `${check.bindingBrand} ${check.bindingSerial}`.trim(),
      actual: form.actualBinding || "未找到固定器",
    });
  }

  if (normalize(form.actualHoles) !== normalize(check.holePattern)) {
    missing.push({
      kind: "holes",
      label: "孔位不符",
      expected: check.holePattern,
      actual: form.actualHoles || "未记录孔位",
    });
  }

  for (const item of check.accessories) {
    const actual = form.qty[item.id] ?? 0;
    if (actual < item.qty) {
      missing.push({
        kind: "accessory",
        label: `${item.name}缺 ${item.qty - actual} 件`,
        expected: `应交 ${item.qty}`,
        actual: `实交 ${actual}`,
      });
    }
  }

  return { missing, allMatched: missing.length === 0 };
}

function makeCheck(draft: CheckDraft, at: string): CheckSnapshot {
  return {
    id: uid("chk"),
    at,
    kind: draft.kind,
    bindingBrand: draft.bindingBrand.trim(),
    bindingSerial: draft.bindingSerial.trim(),
    holePattern: draft.holePattern.trim(),
    mountPosition: draft.mountPosition.trim(),
    accessories: draft.accessories
      .filter((a) => a.name.trim())
      .map((a) => ({ id: a.id || uid("acc"), name: a.name.trim(), qty: a.qty })),
    confirmMethod: draft.confirmMethod,
    confirmedBy: draft.confirmedBy.trim(),
    staff: draft.staff.trim(),
    note: draft.note?.trim() || undefined,
    voided: false,
  };
}

/* ----------------------------- localStorage ----------------------------- */

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Order[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* 数据损坏时回退到演示数据 */
  }
  return seedOrders();
}

export function persistOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* 存储不可用时仅保留内存态 */
  }
}

export function clearOrders(): Order[] {
  const fresh = seedOrders();
  persistOrders(fresh);
  return fresh;
}

/* -------------------------------- 业务操作 -------------------------------- */

export function createOrder(draft: NewOrderDraft): Order {
  const at = nowISO();
  const id = nextOrderId();
  const check = makeCheck({ ...draft.check, kind: "intake" }, at);
  const order: Order = {
    id,
    createdAt: at,
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone.trim(),
    boardBrand: draft.boardBrand.trim(),
    boardLength: draft.boardLength.trim(),
    boardType: draft.boardType,
    preference: draft.preference.trim(),
    spec: { ...draft.spec },
    checks: [check],
    status: "repairing",
    attempts: [],
    events: [
      { at, type: "created", text: `收板登记，固定器/孔位/附件按收板核对留存`, staff: check.staff },
    ],
  };
  return order;
}

export function nextOrderId(): string {
  const max = readOrderIds().reduce((m, n) => Math.max(m, n), 105);
  return `ORD-${max + 1}`;
}

function readOrderIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((o) => Number(String(o.id).replace(/\D/g, "")))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

/** 刃角、蜡型或修补发生变化：最近一次有效核对作废，工单回待复核，旧记录保留 */
export function changeSpec(
  order: Order,
  spec: RepairSpec,
  staff: string
): { order: Order; changed: string[] } {
  const changed = specDiff(order.spec, spec);
  if (!changed.length) return { order, changed };

  const at = nowISO();
  const checks = order.checks.map((c) =>
    c.voided
      ? c
      : {
          ...c,
          voided: true,
          voidReason: changed.join("；"),
          voidAt: at,
        }
  );

  const events: TimelineEvent[] = [
    ...order.events,
    {
      at,
      type: "spec_changed",
      text: `维修参数变化（${changed.join("；")}），先前核对作废，工单退回待复核`,
      staff,
    },
  ];

  return {
    order: { ...order, spec: { ...spec }, checks, status: "recheck", events },
    changed,
  };
}

/** 复核通过：生成新的核对快照，工单回到维修中（可继续完工） */
export function submitRecheck(order: Order, draft: CheckDraft): Order {
  const at = nowISO();
  const check = makeCheck({ ...draft, kind: "recheck" }, at);
  return {
    ...order,
    checks: [...order.checks, check],
    status: "repairing",
    events: [
      ...order.events,
      {
        at,
        type: "recheck",
        text: `复核通过：固定器编号、孔位、附件重新核对一致（${check.confirmMethod}）`,
        staff: check.staff,
      },
    ],
  };
}

export function markReady(order: Order, staff: string): Order {
  const at = nowISO();
  return {
    ...order,
    status: "ready",
    readyAt: at,
    events: [...order.events, { at, type: "ready", text: "完工，已通知客户取板", staff }],
  };
}

/** 取板核验：匹配且客户确认则交付；否则留存待取并登记缺项清单 */
export function submitPickup(order: Order, form: PickupForm): Order {
  const check = validCheck(order);
  if (!check) return order;
  const { missing } = evaluatePickup(form, check);
  const at = nowISO();
  const attempt: PickupAttempt = {
    id: uid("att"),
    at,
    staff: form.staff.trim(),
    actualBinding: form.actualBinding.trim(),
    actualHoles: form.actualHoles.trim(),
    actualQty: { ...form.qty },
    missing,
    customerAgreed: form.customerConfirmed,
    delivered: form.deliver && missing.length === 0 && form.customerConfirmed,
  };

  if (!attempt.delivered) {
    return { ...order, status: "ready", attempts: [...order.attempts, attempt] };
  }

  const delivery: DeliverySnapshot = {
    at,
    staff: attempt.staff,
    bindingBrand: check.bindingBrand,
    bindingSerial: check.bindingSerial,
    holePattern: check.holePattern,
    mountPosition: check.mountPosition,
    accessories: check.accessories.map((a) => ({ ...a })),
    confirmMethod: form.confirmMethod,
    customerName: form.customerName.trim() || order.customerName,
    customerConfirmed: true,
  };

  return {
    ...order,
    status: "delivered",
    delivery,
    attempts: [...order.attempts, attempt],
    events: [
      ...order.events,
      {
        at,
        type: "delivered",
        text: "取板核验通过，固定器/孔位/附件全部对上，客户确认后交付",
        staff: attempt.staff,
      },
    ],
  };
}

/* -------------------------------- 演示数据 -------------------------------- */

function iso(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function acc(name: string, qty: number): Accessory {
  return { id: uid("acc"), name, qty };
}

function seedOrders(): Order[] {
  const intake1 = makeCheck(
    {
      kind: "intake",
      bindingBrand: "Burton EST",
      bindingSerial: "BTE-2024-77132",
      holePattern: "4×2 标准孔位 / 间距 4×4cm",
      mountPosition: "参考线 +1 孔位",
      accessories: [acc("附件袋", 1), acc("备用螺丝", 4), acc("止滑贴", 1)],
      confirmMethod: "现场签字",
      confirmedBy: "李先生",
      staff: "王磊",
    },
    iso(3, 10)
  );
  const order1: Order = {
    id: "ORD-106",
    createdAt: iso(3, 10),
    customerName: "李先生",
    customerPhone: "138****6201",
    boardBrand: "Burton Custom 156",
    boardLength: "156",
    boardType: "全地域",
    preference: "偏软一点的固定力度",
    spec: { edgeSide: "88°", edgeBase: "1°", waxType: "低温蜡", repairNote: "底板划痕 12cm，补 P-Tex" },
    checks: [intake1],
    status: "ready",
    readyAt: iso(0, 11),
    attempts: [],
    events: [
      { at: iso(3, 10), type: "created", text: "收板登记，固定器/孔位/附件按收板核对留存", staff: "王磊" },
      { at: iso(0, 11), type: "ready", text: "完工，已通知客户取板", staff: "陈静" },
    ],
  };

  const intake2 = makeCheck(
    {
      kind: "intake",
      bindingBrand: "Marker Race",
      bindingSerial: "MRC-19X-09281",
      holePattern: "竞速滑轨 2 列",
      mountPosition: "居中，前后各 2 颗",
      accessories: [acc("附件袋", 1), acc("雪板包", 1)],
      confirmMethod: "工单签名",
      confirmedBy: "赵教练",
      staff: "陈静",
    },
    iso(2, 9)
  );
  const changedSpec: RepairSpec = {
    edgeSide: "87°",
    edgeBase: "0.5°",
    waxType: "氟素竞技蜡",
    repairNote: "板头补 P-Tex 后打磨平整",
  };
  const voided2: CheckSnapshot = {
    ...intake2,
    voided: true,
    voidAt: iso(1, 16),
    voidReason: "侧刃角：88° → 87°；蜡型：全温蜡 → 氟素竞技蜡；修补说明：待补P-Tex → 板头补 P-Tex 后打磨平整",
  };
  const order2: Order = {
    id: "ORD-112",
    createdAt: iso(2, 9),
    customerName: "赵教练",
    customerPhone: "139****0427",
    boardBrand: "竞速板 165",
    boardLength: "165",
    boardType: "竞速板",
    preference: "弱咬雪，出弯更顺",
    spec: changedSpec,
    checks: [voided2],
    status: "recheck",
    attempts: [],
    events: [
      { at: iso(2, 9), type: "created", text: "收板登记，固定器/孔位/附件按收板核对留存", staff: "陈静" },
      {
        at: iso(1, 16),
        type: "spec_changed",
        text: "维修参数变化（侧刃角/蜡型/修补说明），先前核对作废，工单退回待复核",
        staff: "陈静",
      },
    ],
  };

  const intake3 = makeCheck(
    {
      kind: "intake",
      bindingBrand: "Union Atlas",
      bindingSerial: "UA-23-55210",
      holePattern: "Channel 卡槽 / 居中",
      mountPosition: "前脚 25.5° 后脚 -9°",
      accessories: [acc("附件袋", 1), acc("滑雪杖", 1), acc("脚垫", 2)],
      confirmMethod: "微信确认",
      confirmedBy: "周女士",
      staff: "王磊",
    },
    iso(6, 14)
  );
  const attempt3: PickupAttempt = {
    id: uid("att"),
    at: iso(3, 18),
    staff: "王磊",
    actualBinding: "UA-23-55210",
    actualHoles: "Channel 卡槽 / 居中",
    actualQty: Object.fromEntries([
      [intake3.accessories[0].id, 1],
      [intake3.accessories[1].id, 0],
      [intake3.accessories[2].id, 2],
    ]),
    missing: [
      { kind: "accessory", label: "滑雪杖缺 1 件", expected: "应交 1", actual: "实交 0" },
    ],
    customerAgreed: false,
    delivered: false,
  };
  const delivery3: DeliverySnapshot = {
    at: iso(1, 15),
    staff: "王磊",
    bindingBrand: intake3.bindingBrand,
    bindingSerial: intake3.bindingSerial,
    holePattern: intake3.holePattern,
    mountPosition: intake3.mountPosition,
    accessories: intake3.accessories.map((a) => ({ ...a })),
    confirmMethod: "现场签字",
    customerName: "周女士",
    customerConfirmed: true,
  };
  const order3: Order = {
    id: "ORD-118",
    createdAt: iso(7, 11),
    customerName: "周女士",
    customerPhone: "137****8830",
    boardBrand: "粉雪板 158",
    boardLength: "158",
    boardType: "粉雪板",
    preference: "固定器偏后，浮力更好",
    spec: { edgeSide: "89°", edgeBase: "1°", waxType: "全温蜡", repairNote: "无底板损伤" },
    checks: [intake3],
    status: "delivered",
    readyAt: iso(2, 10),
    delivery: delivery3,
    attempts: [attempt3],
    events: [
      { at: iso(7, 11), type: "created", text: "收板登记，固定器/孔位/附件按收板核对留存", staff: "王磊" },
      { at: iso(2, 10), type: "ready", text: "完工，已通知客户取板", staff: "王磊" },
      { at: iso(1, 15), type: "delivered", text: "取板核验通过，固定器/孔位/附件全部对上，客户确认后交付", staff: "王磊" },
    ],
  };

  return [order3, order2, order1];
}
