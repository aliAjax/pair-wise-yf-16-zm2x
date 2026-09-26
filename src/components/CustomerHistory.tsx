import { useMemo, useState } from "react";
import type { Order } from "../types";
import { STATUS_META, fmtTime } from "../domain";
import { CheckCard } from "./CheckCard";

interface Props {
  orders: Order[];
}

export function CustomerHistory({ orders }: Props) {
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (kw && ![o.customerName, o.customerPhone, o.id].join(" ").toLowerCase().includes(kw)) continue;
      const key = `${o.customerName}__${o.customerPhone || "-"}`;
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.values()].sort((a, b) =>
      b[0].createdAt.localeCompare(a[0].createdAt)
    );
  }, [orders, keyword]);

  return (
    <section className="panel history-panel">
      <div className="heading">
        <div>
          <p>客户历史</p>
          <h2>收板快照与交付快照</h2>
        </div>
        <input
          className="search narrow"
          placeholder="按客户 / 电话 / 工单号查"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="history-groups">
        {groups.map((list) => {
          const customer = list[0].customerName;
          const phone = list[0].customerPhone;
          const key = `${customer}__${phone}`;
          const open = expanded === key;
          const totalChecks = list.reduce((n, o) => n + o.checks.length, 0);
          const delivered = list.filter((o) => o.status === "delivered").length;
          return (
            <article className="history-group" key={key}>
              <button className="history-head" onClick={() => setExpanded(open ? null : key)}>
                <div>
                  <h3>{customer}</h3>
                  <p className="muted">
                    {phone || "未留电话"} · {list.length} 张工单 · {totalChecks} 次核对 · {delivered} 次交付
                  </p>
                </div>
                <span className="chevron">{open ? "收起 ▴" : "展开快照 ▾"}</span>
              </button>

              {open && (
                <div className="history-orders">
                  {list
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((o) => (
                      <div className="history-order" key={o.id}>
                        <header>
                          <div>
                            <b>{o.id}</b>
                            <h4>
                              {o.boardBrand}
                              {o.boardLength ? ` ${o.boardLength}cm` : ""}
                            </h4>
                          </div>
                          <span className={`badge badge-${STATUS_META[o.status].tone}`}>
                            {STATUS_META[o.status].label}
                          </span>
                        </header>

                        <div className="snapshot-strip">
                          {o.checks.map((c) => (
                            <CheckCard key={c.id} check={c} compact />
                          ))}
                        </div>

                        {o.delivery && (
                          <div className="delivery-strip">
                            <span className="tag tag-green">交付快照</span>
                            <span>{fmtTime(o.delivery.at)}</span>
                            <span>
                              {o.delivery.customerName} · {o.delivery.confirmMethod}确认匹配
                            </span>
                            <span>
                              交付：{o.delivery.accessories.map((a) => `${a.name}×${a.qty}`).join("、") || "无附件"}
                            </span>
                            <span className="muted">经办：{o.delivery.staff}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </article>
          );
        })}
        {groups.length === 0 && <p className="muted empty">没有匹配的客户记录。</p>}
      </div>
    </section>
  );
}
