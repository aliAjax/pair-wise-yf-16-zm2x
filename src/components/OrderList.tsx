import { useMemo, useState } from "react";
import type { Order, OrderStatus } from "../types";
import { STATUS_LABEL } from "../types";
import { accessoryText, fmtTime, validVerification } from "../utils";

interface Props {
  orders: Order[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onReset: () => void;
}

type Filter = "all" | OrderStatus;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "repairing", label: "维修中" },
  { key: "recheck", label: "待复核" },
  { key: "ready", label: "待取板" },
  { key: "delivered", label: "已交付" },
];

export default function OrderList({ orders, onSelect, onNew, onReset }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    return orders
      .filter((o) => (filter === "all" ? true : o.status === filter))
      .filter((o) => {
        const k = keyword.trim();
        if (!k) return true;
        return [o.id, o.customer, o.brand, o.phone, o.shape]
          .join(" ")
          .toLowerCase()
          .includes(k.toLowerCase());
      })
      .sort((a, b) => b.intake.receivedAt - a.intake.receivedAt);
  }, [orders, filter, keyword]);

  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const missingCount = orders.filter(
    (o) => o.status === "ready" && o.missingItems.length > 0
  ).length;

  return (
    <div className="list-layout">
      <section className="metrics">
        <Metric label="维修中" value={count("repairing")} tone="primary" />
        <Metric label="待复核（核对作废）" value={count("recheck")} tone="warn" />
        <Metric label="待取板（含缺项）" value={count("ready")} sub={`${missingCount} 单有缺项`} tone="accent" />
        <Metric label="已交付" value={count("delivered")} tone="ok" />
      </section>

      <div className="panel">
        <div className="heading">
          <div>
            <p>收板与交付核验台</p>
            <h2>工单列表</h2>
          </div>
          <div className="head-actions">
            <button className="ghost" onClick={onReset} title="恢复内置演示数据">
              重置演示数据
            </button>
            <button className="primary" onClick={onNew}>
              收板登记新工单
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="chips">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? "chip active" : "chip"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key !== "all" && (
                  <em className="chip-count">{count(f.key as OrderStatus)}</em>
                )}
              </button>
            ))}
          </div>
          <input
            className="search"
            placeholder="搜索工单号 / 客户 / 品牌 / 电话"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="order-cards">
          {filtered.length === 0 && (
            <p className="muted empty">没有符合条件的工单。</p>
          )}
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onSelect={() => onSelect(o.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <em>{sub}</em>}
    </article>
  );
}

function OrderCard({ order, onSelect }: { order: Order; onSelect: () => void }) {
  const v = validVerification(order);
  return (
    <button className="order-card" onClick={onSelect}>
      <div className="order-card-main">
        <div className="order-card-title">
          <span className={`status-dot status-${order.status}`} />
          <b>{order.id}</b>
          <span className="muted">
            {order.customer} · {order.brand} {order.length}cm · {order.shape}
          </span>
        </div>
        <p className="order-card-meta">
          收板 {fmtTime(order.intake.receivedAt)} · 固定器{" "}
          {order.intake.bindings.map((b) => b.no).join(" / ")}
        </p>
        <p className="order-card-meta">
          附件：{accessoryText(order.intake.accessories)}
          {order.status === "ready" && order.missingItems.length > 0 && (
            <span className="missing-flag">
              {" "}
              · 缺：{accessoryText(order.missingItems)}
            </span>
          )}
          {order.status === "recheck" && (
            <span className="warn-flag"> · 参数变化，先前核对已作废</span>
          )}
          {order.status === "ready" && v && (
            <span className="ok-flag"> · 完工核验通过，待取板核对</span>
          )}
        </p>
      </div>
      <span className={`status-badge status-${order.status}`}>
        {STATUS_LABEL[order.status]}
      </span>
    </button>
  );
}
