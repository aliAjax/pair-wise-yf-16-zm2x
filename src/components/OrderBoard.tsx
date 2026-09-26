import { useMemo, useState } from "react";
import type { Order, OrderStatus } from "../types";
import { BOARD_TYPES, STATUS_META, fmtTime, latestCheck, markReady, validCheck } from "../domain";
import { CheckCard } from "./CheckCard";
import { SpecCard } from "./SpecCard";
import { RecheckPanel } from "./RecheckPanel";
import { PickupPanel } from "./PickupPanel";

interface Props {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMutate: (order: Order) => void;
}

const STATUS_ORDER: OrderStatus[] = ["recheck", "repairing", "ready", "delivered"];

export function OrderBoard({ orders, selectedId, onSelect, onMutate }: Props) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return orders
      .filter((o) => (statusFilter === "all" ? true : o.status === statusFilter))
      .filter((o) => (typeFilter === "all" ? true : o.boardType === typeFilter))
      .filter((o) =>
        !kw
          ? true
          : [o.id, o.customerName, o.customerPhone, o.boardBrand]
              .join(" ")
              .toLowerCase()
              .includes(kw)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, statusFilter, typeFilter, keyword]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of STATUS_ORDER) c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [orders]);

  return (
    <section className="board">
      <div className="panel board-list">
        <div className="heading">
          <div>
            <p>工单看板</p>
            <h2>收板与交付核验台</h2>
          </div>
        </div>

        <input
          className="search"
          placeholder="搜工单号 / 客户 / 电话 / 板"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <div className="filter-tabs">
          <button
            className={statusFilter === "all" ? "active" : ""}
            onClick={() => setStatusFilter("all")}
          >
            全部 {counts.all}
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={`${statusFilter === s ? "active" : ""} tab-${STATUS_META[s].tone}`}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_META[s].label} {counts[s] ?? 0}
            </button>
          ))}
        </div>

        <div className="chips">
          <button className={typeFilter === "all" ? "active" : ""} onClick={() => setTypeFilter("all")}>
            全部板型
          </button>
          {BOARD_TYPES.map((t) => (
            <button key={t} className={typeFilter === t ? "active" : ""} onClick={() => setTypeFilter(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="order-cards">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} active={o.id === selectedId} onClick={() => onSelect(o.id)} />
          ))}
          {filtered.length === 0 && <p className="muted empty">没有符合筛选的工单。</p>}
        </div>
      </div>

      <div className="board-detail">
        {selected ? (
          <OrderDetail key={selected.id} order={selected} onMutate={onMutate} />
        ) : (
          <div className="panel placeholder">
            <p>从左侧选择工单，查看收板快照、维修变化与取板核验。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderCard({ order, active, onClick }: { order: Order; active: boolean; onClick: () => void }) {
  const meta = STATUS_META[order.status];
  const check = validCheck(order);
  const lastAttempt = order.attempts[order.attempts.length - 1];
  const hasHold = order.status === "ready" && lastAttempt && !lastAttempt.delivered;
  return (
    <button className={`order-card ${active ? "active" : ""} tone-${meta.tone}`} onClick={onClick}>
      <header>
        <b>{order.id}</b>
        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
      </header>
      <h3>{order.boardBrand}</h3>
      <p>
        {order.customerName} · {order.boardType}
        {order.boardLength ? ` ${order.boardLength}cm` : ""}
      </p>
      <p className="muted">
        固定器：{check?.bindingSerial || "—"}
      </p>
      {order.status === "recheck" && <p className="flag-amber">维修参数已变，待复核</p>}
      {hasHold && <p className="flag-red">缺项 {lastAttempt.missing.length} 项，留存待取</p>}
      <time>{fmtTime(order.createdAt)}</time>
    </button>
  );
}

function OrderDetail({ order, onMutate }: { order: Order; onMutate: (o: Order) => void }) {
  const meta = STATUS_META[order.status];
  const current = validCheck(order);
  const [completeStaff, setCompleteStaff] = useState("");
  const [completeMsg, setCompleteMsg] = useState<string | null>(null);

  const complete = () => {
    if (!completeStaff.trim()) {
      setCompleteMsg("请填写完工通知经办人。");
      return;
    }
    onMutate(markReady(order, completeStaff.trim()));
    setCompleteMsg("已完工并通知取板。");
  };

  return (
    <>
      <section className="panel detail-head">
        <div className="heading">
          <div>
            <p>
              {order.id} · {order.customerName} {order.customerPhone}
            </p>
            <h2>{order.boardBrand}</h2>
          </div>
          <span className={`badge badge-${meta.tone} big`}>{meta.label}</span>
        </div>
        <p className="muted">
          {order.boardType}
          {order.boardLength ? ` · ${order.boardLength}cm` : ""}
          {order.preference ? ` · 偏好：${order.preference}` : ""}
        </p>

        {order.status === "repairing" && (
          <div className="action-row complete-row">
            <label className="field staff-field">
              <span>完工通知经办</span>
              <input value={completeStaff} onChange={(e) => setCompleteStaff(e.target.value)} placeholder="通知技师" />
            </label>
            <button className="primary" type="button" onClick={complete}>
              完工并通知取板
            </button>
          </div>
        )}
        {completeMsg && <div className="alert info">{completeMsg}</div>}
        {order.status === "ready" && order.readyAt && (
          <div className="alert success">已于 {fmtTime(order.readyAt)} 完工并通知取板，等待下方核验交付。</div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>核对快照</p>
            <h2>收板记录 · 旧记录全部保留</h2>
          </div>
        </div>
        {order.status === "recheck" && (
          <div className="alert warning">
            最近一次核对已作废：{latestCheck(order)?.voidReason}
          </div>
        )}
        <div className="check-stack">
          {[...order.checks].reverse().map((c) => (
            <CheckCard key={c.id} check={c} />
          ))}
        </div>
      </section>

      {order.status === "recheck" && <RecheckPanel order={order} onRecheck={onMutate} />}

      <SpecCard order={order} disabled={order.status === "delivered"} onChangeSpec={onMutate} />

      {order.status === "ready" && <PickupPanel order={order} onPickup={onMutate} />}

      {order.status === "delivered" && order.delivery && (
        <section className="panel delivery-panel">
          <div className="heading">
            <div>
              <p>交付快照</p>
              <h2>已核验交付</h2>
            </div>
            <span className="badge badge-green big">已交付</span>
          </div>
          <CheckCard
            check={{
              ...(current ?? order.checks[order.checks.length - 1]),
              kind: "intake",
            }}
            compact
          />
          <dl className="kv-grid delivery-kv">
            <div>
              <dt>交付时间</dt>
              <dd>{fmtTime(order.delivery.at)}</dd>
            </div>
            <div>
              <dt>取板客户</dt>
              <dd>
                {order.delivery.customerName}（{order.delivery.confirmMethod}，已确认匹配）
              </dd>
            </div>
            <div>
              <dt>交付经办</dt>
              <dd>{order.delivery.staff}</dd>
            </div>
            <div>
              <dt>交付附件</dt>
              <dd>{order.delivery.accessories.map((a) => `${a.name}×${a.qty}`).join("、") || "无"}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="panel timeline-panel">
        <div className="heading">
          <div>
            <p>工单轨迹</p>
            <h2>收板 → 变化作废 → 复核 → 取板</h2>
          </div>
        </div>
        <ol className="timeline">
          {[...order.events].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`}>
              <time>{fmtTime(e.at)}</time>
              <span className={`dot dot-${e.type}`} />
              <div>
                <p>{e.text}</p>
                {e.staff && <small className="muted">经办：{e.staff}</small>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
