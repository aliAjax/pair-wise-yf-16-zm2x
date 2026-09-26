import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Order } from "./types";
import { clearOrders, loadOrders, persistOrders } from "./domain";
import { IntakeForm } from "./components/IntakeForm";
import { OrderBoard } from "./components/OrderBoard";
import { CustomerHistory } from "./components/CustomerHistory";

function App() {
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = loadOrders();
    const first = [...initial].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return first?.id ?? null;
  });

  useEffect(() => {
    persistOrders(orders);
  }, [orders]);

  const metrics = useMemo(() => {
    const repairing = orders.filter((o) => o.status === "repairing").length;
    const recheck = orders.filter((o) => o.status === "recheck").length;
    const readyOrders = orders.filter((o) => o.status === "ready");
    const heldMissing = readyOrders.reduce((n, o) => {
      const last = o.attempts[o.attempts.length - 1];
      return n + (last && !last.delivered ? last.missing.length : 0);
    }, 0);
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return [
      { key: "repairing", label: "维修中（核对有效）", value: repairing, tone: "blue" as const },
      { key: "recheck", label: "待复核（旧核对已作废）", value: recheck, tone: "amber" as const },
      {
        key: "ready",
        label: "待取板",
        value: readyOrders.length,
        sub: heldMissing ? `缺项留存 ${heldMissing} 项` : "均可核验",
        tone: "teal" as const,
      },
      { key: "delivered", label: "已交付", value: delivered, tone: "green" as const },
    ];
  }, [orders]);

  const upsert = (order: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev];
    });
    setSelectedId(order.id);
  };

  const resetDemo = () => {
    if (window.confirm("确定清空当前浏览器数据并恢复演示工单？")) {
      const fresh = clearOrders();
      setOrders(fresh);
      setSelectedId(fresh[0]?.id ?? null);
    }
  };

  const readyWithMissing = orders
    .filter((o) => o.status === "ready")
    .some((o) => {
      const last = o.attempts[o.attempts.length - 1];
      return last && !last.delivered && last.missing.length > 0;
    });

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62004 · 收板与交付核验台</p>
        <h1>滑雪板送修 · 随板固定器与附件核验</h1>
        <span>
          固定器和附件袋跟板留下：收板时登记固定器编号、孔位、附件与客户确认方式；维修中刃角、蜡型或修补一旦有变化，先前核对作废、工单回待复核并保留旧记录；取板逐项对上且客户确认匹配方可交付，缺项一律留存待取并列清单。所有数据只存本浏览器。
        </span>
        <div className="hero-actions">
          <span className="local-note">数据保存在 localStorage，不上传服务器</span>
          <button type="button" onClick={resetDemo}>
            恢复演示数据
          </button>
        </div>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.key} className={`metric metric-${m.tone}`}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
            {m.sub && <em className="metric-sub">{m.sub}</em>}
          </article>
        ))}
      </section>

      {readyWithMissing && (
        <div className="alert warning banner">
          有待取板工单存在缺项：已按规则留存待取，缺项清单见工单内「历次取板核验」。
        </div>
      )}

      <OrderBoard orders={orders} selectedId={selectedId} onSelect={setSelectedId} onMutate={upsert} />

      <IntakeForm onCreate={upsert} />

      <CustomerHistory orders={orders} />

      <footer className="footnote">
        收板、复核、交付快照均写入浏览器本地存储（{`localStorage["ski-check-desk:v1"]`}），清空浏览器数据后记录将消失。
        当前共 {orders.length} 张工单，
        {orders.reduce((n, o) => n + o.checks.length, 0)} 份核对快照（含作废留存）。
      </footer>
    </main>
  );
}

export default App;
