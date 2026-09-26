import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import OrderList from "./components/OrderList";
import IntakeForm from "./components/IntakeForm";
import OrderDetail from "./components/OrderDetail";
import type {
  Binding,
  CheckState,
  Order,
  Verification,
} from "./types";
import { clearOrders, loadOrders, saveOrders, uid } from "./storage";
import {
  checkAccessories,
  checkBindings,
  currentSpec,
  specChanged,
} from "./utils";

type View = "list" | "new" | "detail";

export default function App() {
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId]
  );

  function openDetail(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  function createOrder(order: Order) {
    setOrders((os) => [order, ...os]);
    openDetail(order.id);
  }

  /* 维修方案变更：刃角/蜡型/修补变化 → 旧核对作废，工单回待复核 */
  function handleSpecChange(
    orderId: string,
    next: {
      edgeAngle: string;
      wax: string;
      repair: string;
      preference: string;
      reason: string;
      changedBy: string;
    }
  ) {
    setOrders((os) =>
      os.map((o) => {
        if (o.id !== orderId) return o;
        const prev = currentSpec(o);
        const changed = specChanged(prev, next);
        const ts = Date.now();
        const diffs: string[] = [];
        if (prev.edgeAngle.trim() !== next.edgeAngle.trim())
          diffs.push(`刃角「${prev.edgeAngle}」→「${next.edgeAngle}」`);
        if (prev.wax.trim() !== next.wax.trim())
          diffs.push(`蜡型「${prev.wax}」→「${next.wax}」`);
        if (prev.repair.trim() !== next.repair.trim())
          diffs.push(`修补「${prev.repair}」→「${next.repair}」`);

        const verifications: Verification[] = changed
          ? o.verifications.map((v) =>
              v.valid
                ? {
                    ...v,
                    valid: false,
                    voidReason: `刃角/蜡型/修补变更：${diffs.join("；")}（${next.reason}）`,
                  }
                : v
            )
          : o.verifications;

        const timeline = [...o.timeline];
        if (changed) {
          timeline.push({
            at: ts,
            text: `参数变化（${diffs.join("；")}），先前核对作废，工单回待复核`,
          });
        } else {
          timeline.push({ at: ts, text: `维修信息更新（客户偏好/备注）：${next.reason}` });
        }

        return {
          ...o,
          specVersions: [
            ...o.specVersions,
            { ...next, changedAt: ts, changedBy: next.changedBy },
          ],
          verifications,
          status:
            changed && o.status !== "delivered"
              ? "recheck"
              : o.status,
          timeline,
        };
      })
    );
  }

  /* 完工核验：三项全过 → 待取板并记录通知；否则留在待复核 */
  function handleVerify(orderId: string, v: Omit<Verification, "id" | "at">) {
    setOrders((os) =>
      os.map((o) => {
        if (o.id !== orderId) return o;
        const ts = Date.now();
        const record: Verification = { ...v, id: uid("v"), at: ts };
        const timeline = [...o.timeline];
        if (v.passed) {
          timeline.push({
            at: ts,
            text: `完工核验通过（固定器/孔位/附件一致，${v.staff}），已通知客户取板`,
          });
          return {
            ...o,
            verifications: [...o.verifications, record],
            status: "ready",
            notifiedAt: ts,
            timeline,
          };
        }
        timeline.push({
          at: ts,
          text: `完工核验未通过（${v.staff}）：${describeFail(v)}，留在待复核`,
        });
        return {
          ...o,
          verifications: [...o.verifications, record],
          status: "recheck",
          timeline,
        };
      })
    );
  }

  /* 取板核验：全对上+客户确认 → 交付；否则留在待取并列缺项清单 */
  function handlePickup(
    orderId: string,
    input: {
      staff: string;
      bindingCheck: CheckState;
      holesCheck: CheckState;
      accessoriesCheck: CheckState;
      bindingsNow: string;
      holesNow: string;
      presentNames: string;
      customerConfirmed: boolean;
      confirmMethod: Order["intake"]["confirmMethod"];
      confirmedBy: string;
      note: string;
    }
  ) {
    setOrders((os) =>
      os.map((o) => {
        if (o.id !== orderId) return o;
        const ts = Date.now();

        const nowBindings: Binding[] = input.bindingsNow
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((no) => ({ no, position: "" }));
        const present = parseAccessories(input.presentNames);

        // 系统按收板快照重新比对，避免人工误点
        const bindingOk =
          input.bindingCheck === "ok" &&
          checkBindings(o.intake, mergeBindingPositions(o.intake.bindings, nowBindings));
        const holesOk =
          input.holesCheck === "ok" &&
          input.holesNow.replace(/\s/g, "") !== "" &&
          input.holesNow.replace(/\s/g, "") ===
            o.intake.holes.replace(/\s/g, "");
        const acc = checkAccessories(o.intake, present);
        const accessoriesOk = input.accessoriesCheck === "ok" && acc.ok;

        const mismatched: string[] = [];
        if (!bindingOk) mismatched.push("固定器编号/孔位与收板不符");
        if (!holesOk) mismatched.push("孔位描述与收板不符");
        if (!acc.ok) mismatched.push(`缺 ${accessoryText(acc.missing)}`);

        const allMatch = bindingOk && holesOk && accessoriesOk;
        const deliver = allMatch && input.customerConfirmed && input.confirmedBy !== "";

        const record = {
          id: uid("p"),
          at: ts,
          staff: input.staff,
          bindingCheck: (bindingOk ? "ok" : "bad") as CheckState,
          holesCheck: (holesOk ? "ok" : "bad") as CheckState,
          accessoriesCheck: (accessoriesOk ? "ok" : "bad") as CheckState,
          missing: acc.missing,
          customerConfirmed: input.customerConfirmed,
          confirmMethod: input.confirmMethod,
          confirmedBy: input.confirmedBy,
          delivered: deliver,
          ...(deliver ? { deliveredAt: ts } : {}),
          bindingsNow: input.bindingsNow,
          holesNow: input.holesNow,
          presentNames: input.presentNames,
          note: input.note,
        };

        const timeline = [...o.timeline];
        if (deliver) {
          timeline.push({
            at: ts,
            text: `取板核验：固定器、孔位、附件全部对上，客户${input.confirmMethod}确认匹配（${input.confirmedBy}），已交付`,
          });
          return {
            ...o,
            pickups: [...o.pickups, record],
            missingItems: [],
            status: "delivered",
            deliveredAt: ts,
            timeline,
          };
        }

        const reasons: string[] = [];
        if (mismatched.length) reasons.push(mismatched.join("；"));
        if (!input.customerConfirmed || !input.confirmedBy)
          reasons.push("客户未确认匹配");
        timeline.push({
          at: ts,
          text: `取板核验未交付（${input.staff}）：${reasons.join("；") || "留在待取"}，雪板留在待取板`,
        });
        return {
          ...o,
          pickups: [...o.pickups, record],
          missingItems: acc.missing,
          status: "ready",
          timeline,
        };
      })
    );
  }

  function resetData() {
    const seeded = clearOrders();
    setOrders(seeded);
    setSelectedId(null);
    setView("list");
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>滑雪板收板与交付核验台</h1>
          <p>
            固定器与附件袋跟板留店 · 收板快照锁定 · 参数变化旧核对作废 · 三项对上+客户确认方可交付
          </p>
        </div>
        <span className="store-tag">数据仅存本浏览器（localStorage）</span>
      </header>

      {view === "list" && (
        <OrderList
          orders={orders}
          onSelect={openDetail}
          onNew={() => setView("new")}
          onReset={resetData}
        />
      )}
      {view === "new" && (
        <div className="panel detail-panel">
          <IntakeForm onCancel={() => setView("list")} onCreate={createOrder} />
        </div>
      )}
      {view === "detail" && selected && (
        <div className="panel detail-panel">
          <OrderDetail
            order={selected}
            onBack={() => setView("list")}
            onSpecChange={handleSpecChange}
            onVerify={handleVerify}
            onPickup={handlePickup}
          />
        </div>
      )}
      {view === "detail" && !selected && (
        <div className="panel">
          <p>工单不存在。</p>
          <button className="primary" onClick={() => setView("list")}>
            返回列表
          </button>
        </div>
      )}
    </main>
  );
}

function describeFail(v: Omit<Verification, "id" | "at">): string {
  const parts: string[] = [];
  if (!v.bindingOk) parts.push("固定器编号不符");
  if (!v.holesOk) parts.push("孔位不符");
  if (!v.accessoriesOk) parts.push("附件不齐");
  return parts.join("、") || v.note || "未说明";
}

function parseAccessories(text: string): { name: string; qty: number }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)[×xX*]\s*(\d+)\s*$/);
      if (m) return { name: m[1].trim(), qty: Number(m[2]) };
      return { name: line, qty: 1 };
    });
}

function accessoryText(list: { name: string; qty: number }[]): string {
  if (list.length === 0) return "无";
  return list.map((a) => `${a.name} ×${a.qty}`).join("、");
}

/** 用收板时的孔位描述补全实查只填了编号的固定器，便于比对编号 */
function mergeBindingPositions(
  intake: Binding[],
  now: Binding[]
): Binding[] {
  return now.map((n) => {
    const hit = intake.find((b) => b.no.trim() === n.no.trim());
    return hit ? { no: n.no, position: hit.position } : n;
  });
}
