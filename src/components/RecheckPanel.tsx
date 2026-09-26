import { useState } from "react";
import type { CheckDraft, Order } from "../types";
import { CONFIRM_METHODS, submitRecheck, uid } from "../domain";
import type { Accessory } from "../types";

interface Props {
  order: Order;
  onRecheck: (order: Order) => void;
}

export function RecheckPanel({ order, onRecheck }: Props) {
  const last = order.checks[order.checks.length - 1];
  const [draft, setDraft] = useState<CheckDraft>(() => ({
    kind: "recheck",
    bindingBrand: last?.bindingBrand ?? "",
    bindingSerial: last?.bindingSerial ?? "",
    holePattern: last?.holePattern ?? "",
    mountPosition: last?.mountPosition ?? "",
    accessories: (last?.accessories ?? []).map((a) => ({ ...a })),
    confirmMethod: last?.confirmMethod ?? "现场签字",
    confirmedBy: order.customerName,
    staff: "",
    note: "",
  }));
  const [error, setError] = useState<string | null>(null);

  const setAcc = (id: string, patch: Partial<Accessory>) =>
    setDraft((d) => ({
      ...d,
      accessories: d.accessories.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));

  const addAcc = () =>
    setDraft((d) => ({ ...d, accessories: [...d.accessories, { id: uid("acc"), name: "", qty: 1 }] }));

  const removeAcc = (id: string) =>
    setDraft((d) => ({ ...d, accessories: d.accessories.filter((a) => a.id !== id) }));

  const submit = () => {
    const missing: string[] = [];
    if (!draft.bindingSerial.trim()) missing.push("固定器编号");
    if (!draft.holePattern.trim()) missing.push("安装孔位");
    if (draft.accessories.some((a) => !a.name.trim())) missing.push("附件名称有空行");
    if (!draft.confirmedBy.trim()) missing.push("确认人");
    if (!draft.staff.trim()) missing.push("复核经办人");
    if (missing.length) {
      setError(`请补全：${missing.join("、")}`);
      return;
    }
    onRecheck(submitRecheck(order, draft));
  };

  return (
    <section className="panel recheck-panel">
      <div className="heading">
        <div>
          <p>待复核</p>
          <h2>按维修后实物重新核对</h2>
        </div>
        <button className="primary" type="button" onClick={submit}>
          复核通过，留存新快照
        </button>
      </div>
      <p className="muted">
        若拆装固定器导致孔位或编号变化，按实物改正；旧收板快照保留且标记作废，不覆盖历史。
      </p>
      {error && <div className="alert danger">{error}</div>}

      <div className="field-grid">
        <label className="field">
          <span>固定器品牌</span>
          <input value={draft.bindingBrand} onChange={(e) => setDraft({ ...draft, bindingBrand: e.target.value })} />
        </label>
        <label className="field">
          <span>固定器编号 *</span>
          <input value={draft.bindingSerial} onChange={(e) => setDraft({ ...draft, bindingSerial: e.target.value })} />
        </label>
        <label className="field wide">
          <span>安装孔位 *</span>
          <input value={draft.holePattern} onChange={(e) => setDraft({ ...draft, holePattern: e.target.value })} />
        </label>
        <label className="field wide">
          <span>安装位置 / 角度</span>
          <input value={draft.mountPosition} onChange={(e) => setDraft({ ...draft, mountPosition: e.target.value })} />
        </label>
        <label className="field">
          <span>确认方式</span>
          <select
            value={draft.confirmMethod}
            onChange={(e) => setDraft({ ...draft, confirmMethod: e.target.value as CheckDraft["confirmMethod"] })}
          >
            {CONFIRM_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>确认人 *</span>
          <input value={draft.confirmedBy} onChange={(e) => setDraft({ ...draft, confirmedBy: e.target.value })} />
        </label>
        <label className="field">
          <span>复核经办 *</span>
          <input value={draft.staff} onChange={(e) => setDraft({ ...draft, staff: e.target.value })} placeholder="复核技师" />
        </label>
      </div>

      <div className="acc-editor">
        <div className="acc-row acc-head-row">
          <span>随板附件（实物清点）</span>
          <span>数量</span>
          <span />
        </div>
        {draft.accessories.map((a) => (
          <div className="acc-row" key={a.id}>
            <input value={a.name} onChange={(e) => setAcc(a.id, { name: e.target.value })} />
            <input
              type="number"
              min={1}
              value={a.qty}
              onChange={(e) => setAcc(a.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
            />
            <button type="button" className="icon-btn" onClick={() => removeAcc(a.id)}>
              移除
            </button>
          </div>
        ))}
        <button type="button" className="ghost" onClick={addAcc}>
          + 添加附件
        </button>
      </div>
    </section>
  );
}
