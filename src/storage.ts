import type { Order, SpecVersion } from "./types";

const STORAGE_KEY = "ski-board-checkin-orders-v1";

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function now(): number {
  return Date.now();
}

function seedOrders(): Order[] {
  const t0 = now() - 1000 * 60 * 60 * 24 * 3;
  const t1 = t0 + 1000 * 60 * 60 * 5;

  const spec1: SpecVersion = {
    edgeAngle: "侧刃 88° / 底刃 1°",
    wax: "低温蜡（-10℃ 以下）",
    repair: "无",
    preference: "弱咬雪，易换刃",
    changedAt: t0,
    changedBy: "阿峰",
    reason: "收板时登记的初始方案",
  };

  const order1: Order = {
    id: "ORD-106",
    customer: "林楠",
    phone: "138****2046",
    brand: "Burton Custom",
    length: "156",
    shape: "全地域",
    status: "repairing",
    intake: {
      bindings: [
        { no: "BUR-MAL-77231", position: "前固定器 4×4 第3排孔" },
        { no: "BUR-MAL-77232", position: "后固定器 4×4 第6排孔" },
      ],
      holes: "前后各 4 颗 M6 螺丝共 8 孔，孔位无滑牙",
      accessories: [
        { name: "附件袋（含备用螺丝 4 颗）", qty: 1 },
        { name: " stomp pad 防滑贴", qty: 1 },
      ],
      confirmMethod: "店内签字",
      confirmedBy: "林楠",
      staff: "前台 小周",
      receivedAt: t0,
      note: "固定器与附件袋随板留店，已当面清点。",
    },
    specVersions: [spec1],
    verifications: [],
    pickups: [],
    missingItems: [],
    timeline: [
      { at: t0, text: "收板：固定器、孔位、附件已登记，客户店内签字确认" },
    ],
  };

  const spec2: SpecVersion = {
    edgeAngle: "侧刃 87° / 底刃 0.5°",
    wax: "全温蜡",
    repair: "P-Tex 补底板划痕 12cm",
    preference: "竞技刻滑设定",
    changedAt: t1,
    changedBy: "阿峰",
    reason: "施工中拆装过固定器，刃角方案调整，旧核对作废",
  };

  const order2: Order = {
    id: "ORD-112",
    customer: "赵竞",
    phone: "139****8810",
    brand: "OGASAKA FC",
    length: "165",
    shape: "竞速板",
    status: "recheck",
    intake: {
      bindings: [
        { no: "OG-PLT-50188", position: "前固定器 EST 滑槽 居中偏前 1 档" },
        { no: "OG-PLT-50189", position: "后固定器 EST 滑槽 居中" },
      ],
      holes: "EST 滑槽无变形；底盘 8 颗固定螺丝齐",
      accessories: [{ name: "附件袋（扭力扳手贴纸+角度尺）", qty: 1 }],
      confirmMethod: "微信确认",
      confirmedBy: "赵竞（微信昵称：竞速赵）",
      staff: "前台 小周",
      receivedAt: t0,
      note: "客户赶时间，清单发微信拍照确认。",
    },
    specVersions: [
      {
        ...spec2,
        edgeAngle: "侧刃 88° / 底刃 1°",
        wax: "低温蜡",
        repair: "待补 P-Tex（划痕 12cm）",
        reason: "收板时登记的初始方案",
      },
      spec2,
    ],
    verifications: [],
    pickups: [],
    missingItems: [],
    timeline: [
      { at: t0, text: "收板：固定器、孔位、附件已登记，客户微信确认" },
      {
        at: t1,
        text: "刃角改为 侧刃87°/底刃0.5°，补 P-Tex；先前核对作废，工单回待复核",
      },
    ],
  };

  const t2 = now() - 1000 * 60 * 60 * 20;
  const order3: Order = {
    id: "ORD-118",
    customer: "陈雪",
    phone: "137****3327",
    brand: "Gentemstick",
    length: "158",
    shape: "粉雪板",
    status: "ready",
    intake: {
      bindings: [
        { no: "GT-24-09221", position: "前固定器 4×4 第2排，外偏 +15°" },
        { no: "GT-24-09222", position: "后固定器 4×4 第5排，外偏 -6°" },
      ],
      holes: "8 孔完整；第5排左一孔有旧补木痕迹",
      accessories: [
        { name: "附件袋", qty: 1 },
        { name: "专用 T 型扳手", qty: 1 },
      ],
      confirmMethod: "店内签字",
      confirmedBy: "陈雪",
      staff: "前台 阿May",
      receivedAt: t2 - 1000 * 60 * 60 * 26,
      note: "客户偏好弱咬雪。",
    },
    specVersions: [
      {
        edgeAngle: "侧刃 89° / 底刃 1°",
        wax: "粉雪温区软蜡",
        repair: "无",
        preference: "弱咬雪",
        changedAt: t2 - 1000 * 60 * 60 * 26,
        changedBy: "阿峰",
        reason: "收板时登记的初始方案",
      },
    ],
    verifications: [
      {
        id: uid("v"),
        at: t2 - 1000 * 60 * 60 * 2,
        staff: "阿峰",
        bindingOk: true,
        holesOk: true,
        accessoriesOk: true,
        passed: true,
        note: "固定器编号与收板一致，孔位、附件袋齐。",
        valid: true,
      },
    ],
    pickups: [
      {
        id: uid("p"),
        at: t2 - 1000 * 60 * 40,
        staff: "阿May",
        bindingCheck: "ok",
        holesCheck: "ok",
        accessoriesCheck: "bad",
        missing: [{ name: "专用 T 型扳手", qty: 1 }],
        customerConfirmed: false,
        confirmMethod: "店内签字",
        confirmedBy: "",
        delivered: false,
        bindingsNow: "GT-24-09221\nGT-24-09222",
        holesNow: "8 孔完整；第5排左一孔有旧补木痕迹",
        presentNames: "附件袋 ×1",
        note: "T 型扳手未找到，客户选择改天再来，板留待取。",
      },
    ],
    missingItems: [{ name: "专用 T 型扳手", qty: 1 }],
    notifiedAt: t2 - 1000 * 60 * 60 * 3,
    timeline: [
      { at: t2 - 1000 * 60 * 60 * 26, text: "收板：清单登记并由客户店内签字" },
      { at: t2 - 1000 * 60 * 60 * 2, text: "完工核验通过，通知客户取板" },
      { at: t2 - 1000 * 60 * 40, text: "取板核验：缺专用 T 型扳手，未交付，留在待取" },
    ],
  };

  return [order1, order2, order3];
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedOrders();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Order[];
  } catch {
    return seedOrders();
  }
}

export function saveOrders(orders: Order[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function clearOrders(): Order[] {
  const seeded = seedOrders();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}
