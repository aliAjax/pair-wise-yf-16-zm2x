export type OrderStatus = "repairing" | "recheck" | "ready" | "delivered";

export type ConfirmMethod = "现场签字" | "拍照存证" | "工单签名" | "微信确认";

export interface Accessory {
  id: string;
  name: string;
  qty: number;
}

/** 收板核对快照（收板首录或维修变化后的复核） */
export interface CheckSnapshot {
  id: string;
  at: string;
  kind: "intake" | "recheck";
  bindingBrand: string;
  bindingSerial: string;
  holePattern: string;
  mountPosition: string;
  accessories: Accessory[];
  confirmMethod: ConfirmMethod;
  confirmedBy: string;
  staff: string;
  note?: string;
  /** 刃角/蜡型/修补发生变化后，旧核对快照作废但保留 */
  voided: boolean;
  voidReason?: string;
  voidAt?: string;
}

export interface RepairSpec {
  edgeSide: string;
  edgeBase: string;
  waxType: string;
  repairNote: string;
}

export interface MissingItem {
  kind: "binding" | "holes" | "accessory";
  label: string;
  expected: string;
  actual: string;
}

/** 取板核验尝试：交付成功或因缺项留存都会留痕 */
export interface PickupAttempt {
  id: string;
  at: string;
  staff: string;
  actualBinding: string;
  actualHoles: string;
  actualQty: Record<string, number>;
  missing: MissingItem[];
  customerAgreed: boolean;
  delivered: boolean;
}

export interface DeliverySnapshot {
  at: string;
  staff: string;
  bindingBrand: string;
  bindingSerial: string;
  holePattern: string;
  mountPosition: string;
  accessories: Accessory[];
  confirmMethod: ConfirmMethod;
  customerName: string;
  customerConfirmed: boolean;
}

export interface TimelineEvent {
  at: string;
  type: "created" | "spec_changed" | "recheck" | "ready" | "delivered";
  text: string;
  staff?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  boardBrand: string;
  boardLength: string;
  boardType: string;
  preference: string;
  spec: RepairSpec;
  checks: CheckSnapshot[];
  status: OrderStatus;
  readyAt?: string;
  attempts: PickupAttempt[];
  delivery?: DeliverySnapshot;
  events: TimelineEvent[];
}

export interface CheckDraft {
  kind: "intake" | "recheck";
  bindingBrand: string;
  bindingSerial: string;
  holePattern: string;
  mountPosition: string;
  accessories: Accessory[];
  confirmMethod: ConfirmMethod;
  confirmedBy: string;
  staff: string;
  note?: string;
}

export interface NewOrderDraft {
  customerName: string;
  customerPhone: string;
  boardBrand: string;
  boardLength: string;
  boardType: string;
  preference: string;
  spec: RepairSpec;
  check: CheckDraft;
}

export interface PickupForm {
  actualBinding: string;
  actualHoles: string;
  qty: Record<string, number>;
  customerName: string;
  confirmMethod: ConfirmMethod;
  staff: string;
  customerConfirmed: boolean;
  deliver: boolean;
}
