export type OrderStatus = "repairing" | "recheck" | "ready" | "delivered";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  repairing: "维修中",
  recheck: "待复核",
  ready: "待取板",
  delivered: "已交付",
};

export const STATUS_HINT: Record<OrderStatus, string> = {
  repairing: "雪板留店施工，完工后提交完工核验。",
  recheck: "维修参数有变化导致先前核对作废，需重新完工核验。",
  ready: "完工核验通过，已通知客户；取板时核对固定器、孔位与附件。",
  delivered: "客户确认匹配，雪板已交付离店。",
};

export type ConfirmMethod = "店内签字" | "微信确认" | "短信确认" | "电话确认";

export const CONFIRM_METHODS: ConfirmMethod[] = [
  "店内签字",
  "微信确认",
  "短信确认",
  "电话确认",
];

export const BOARD_SHAPES = ["全地域", "公园板", "竞速板", "粉雪板"];

export interface Binding {
  /** 固定器编号（品牌/序列号） */
  no: string;
  /** 安装孔位，如 前 4×2 / 后 4×2（EST 滑槽 4 档） */
  position: string;
}

export interface Accessory {
  name: string;
  qty: number;
}

/** 收板快照：留档后不可修改 */
export interface IntakeSnapshot {
  bindings: Binding[];
  holes: string;
  accessories: Accessory[];
  confirmMethod: ConfirmMethod;
  confirmedBy: string;
  staff: string;
  receivedAt: number;
  note: string;
}

export interface ServiceSpec {
  edgeAngle: string;
  wax: string;
  repair: string;
  preference: string;
}

export interface SpecVersion extends ServiceSpec {
  changedAt: number;
  changedBy: string;
  reason: string;
}

/** 完工核验记录 */
export interface Verification {
  id: string;
  at: number;
  staff: string;
  bindingOk: boolean;
  holesOk: boolean;
  accessoriesOk: boolean;
  passed: boolean;
  note: string;
  /** 被后续参数变化作废旧记录时为 false */
  valid: boolean;
  voidReason?: string;
}

export type CheckState = "ok" | "bad" | "unknown";

/** 取板核验记录（未交付也会留档，作为缺项清单） */
export interface PickupRecord {
  id: string;
  at: number;
  staff: string;
  bindingCheck: CheckState;
  holesCheck: CheckState;
  accessoriesCheck: CheckState;
  missing: Accessory[];
  customerConfirmed: boolean;
  confirmMethod: ConfirmMethod;
  confirmedBy: string;
  delivered: boolean;
  deliveredAt?: number;
  /** 取板时实查记录 */
  bindingsNow: string;
  holesNow: string;
  presentNames: string;
  note: string;
}

export interface TimelineEntry {
  at: number;
  text: string;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  brand: string;
  length: string;
  shape: string;
  status: OrderStatus;
  intake: IntakeSnapshot;
  specVersions: SpecVersion[];
  verifications: Verification[];
  pickups: PickupRecord[];
  missingItems: Accessory[];
  notifiedAt?: number;
  deliveredAt?: number;
  timeline: TimelineEntry[];
}
