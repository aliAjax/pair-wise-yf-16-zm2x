import { useMemo, useState } from "react";
import type { Order, PickupForm } from "../types";
import { CONFIRM_METHODS, evaluatePickup, fmtTime, submitPickup, validCheck } from "../domain";

interface Props {
  order: Order;
  onPickup: (order: Order) => void;
}

export function PickupPanel({ order, onPickup }: Props) {
  const check = validCheck(order);
  const accessories = check?.accessories ?? [];

  const [form, setForm] = useState<PickupForm>(() => ({
    actualBinding: check?.bindingSerial ?? "",
    actualHoles: check?.holePattern ?? "",
    qty: Object.fromEntries(accessories.map((a) => [a.id, a.qty])),
    customerName: order.customerName,
    confirmMethod: "现场签字",
    staff: "",
    customerConfirmed: false,
    deliver: true,
  }));
  const [message, setMessage] = useState<string | null>(null);

  const evaluation = useMemo(() => (check ? evaluatePickup(form, check) : null), [form, check]);
  const allMatched = evaluation?.allMatched ?? false;
  const missing = evaluation?.missing ?? [];
  const canDeliver = !!check && allMatched && form.customerConfirmed && form.staff.trim().length > 0;

  if (!check) {
    return <div className="alert danger">没有有效的核对快照，无法核验取板。请先完成复核。</div>;
  }

  const retain = () => {
    if (!form.staff.trim()) {
      setMessage("请填写交付经办人。");
      return;
    }
    onPickup(submitPickup(order, { ...form, deliver: false, customerConfirmed: false }));
    setMessage("已留存待取，缺项清单已登记。");
  };

  const deliver = () => {
    if (!canDeliver) {
      if (!allMatched) setMessage("固定器、孔位或附件未全部对上，不能交付。");
      else if (!form.customerConfirmed) setMessage("客户尚未确认匹配，不能交付。");
      else setMessage("请填写交付经办人。");
      return;
    }
    onPickup(submitPickup(order, { ...form, deliver: true }));
  };

  return (
    <section className="panel pickup-panel">
      <div className="heading">
        <div>
          <p>取板核验</p>
          <h2>固定器 · 孔位 · 附件逐项对照</h2>
        </div>
        <span className={`match-banner ${allMatched ? "ok" : "bad"}`}>
          {allMatched ? "全部对上" : `存在 ${missing.length} 项不符`}
        </span>
      </div>

      <div className="compare-grid">
        <div className="compare-item">
          <div className="compare-label">
            <span>固定器编号</span>
            <i>应收：{check.bindingBrand} {check.bindingSerial}</i>
          </div>
          <input
            value={form.actualBinding}
            onChange={(e) => setForm({ ...form, actualBinding: e.target.value })}
            placeholder="现场实读固定器编号"
          />
          {missing.some((m) => m.kind === "binding") && (
            <em className="miss-flag">编号不一致，禁止交付</em>
          )}
        </div>

        <div className="compare-item">
          <div className="compare-label">
            <span>安装孔位</span>
            <i>应收：{check.holePattern}</i>
          </div>
          <input
            value={form.actualHoles}
            onChange={(e) => setForm({ ...form, actualHoles: e.target.value })}
            placeholder="现场实查孔位/卡槽"
          />
          {missing.some((m) => m.kind === "holes") && (
            <em className="miss-flag">孔位已变动，禁止交付</em>
          )}
        </div>
      </div>

      <div className="pickup-acc">
        <div className="acc-row acc-head-row">
          <span>附件清点</span>
          <span>应交</span>
          <span>实交</span>
        </div>
        {accessories.map((a) => {
          const q = form.qty[a.id] ?? 0;
          const short = q < a.qty;
          return (
            <div className={`acc-row pickup-row ${short ? "short" : ""}`} key={a.id}>
              <span className="acc-name">{a.name}</span>
              <b className="expected-qty">{a.qty}</b>
              <input
                type="number"
                min={0}
                value={q}
                onChange={(e) =>
                  setForm({
                    ...form,
                    qty: { ...form.qty, [a.id]: Math.max(0, Number(e.target.value) || 0) },
                  })
                }
              />
            </div>
          );
        })}
      </div>

      {missing.length > 0 && (
        <div className="missing-box">
          <h4>缺项 / 不符清单（留存待取）</h4>
          <ul>
            {missing.map((m) => (
              <li key={m.label}>
                <b>{m.label}</b>
                <span>
                  {m.expected}；{m.actual}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="field-grid">
        <label className="field">
          <span>取板客户</span>
          <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        </label>
        <label className="field">
          <span>交付确认方式</span>
          <select
            value={form.confirmMethod}
            onChange={(e) => setForm({ ...form, confirmMethod: e.target.value as PickupForm["confirmMethod"] })}
          >
            {CONFIRM_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>交付经办人 *</span>
          <input value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
        </label>
      </div>

      <label className={`confirm-check ${canDeliver ? "" : "blocked-hint"}`}>
        <input
          type="checkbox"
          checked={form.customerConfirmed}
          onChange={(e) => setForm({ ...form, customerConfirmed: e.target.checked })}
        />
        客户已当面核对固定器、孔位、附件并确认匹配
      </label>

      <div className="action-row">
        <button type="button" className="ghost" onClick={retain}>
          缺项留存待取并登记清单
        </button>
        <button type="button" className="primary deliver-btn" onClick={deliver} disabled={!canDeliver}>
          核验通过，客户确认交付
        </button>
      </div>
      {message && <div className="alert info">{message}</div>}

      {order.attempts.length > 0 && (
        <div className="attempts">
          <h4>历次取板核验</h4>
          {[...order.attempts].reverse().map((att) => (
            <article key={att.id} className={`attempt ${att.delivered ? "ok" : "hold"}`}>
              <header>
                <time>{fmtTime(att.at)}</time>
                <span className={att.delivered ? "tag tag-green" : "tag tag-amber"}>
                  {att.delivered ? "已交付" : "留存待取"}
                </span>
                <span className="muted">经办：{att.staff}</span>
              </header>
              {att.missing.length > 0 && (
                <ul className="miss-list">
                  {att.missing.map((m) => (
                    <li key={m.label}>
                      {m.label}（{m.expected}，{m.actual}）
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
