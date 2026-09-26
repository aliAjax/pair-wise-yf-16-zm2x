import { useState } from "react";
import type { Order, RepairSpec } from "../types";
import { WAX_TYPES, changeSpec } from "../domain";

interface Props {
  order: Order;
  disabled: boolean;
  onChangeSpec: (order: Order) => void;
}

export function SpecCard({ order, disabled, onChangeSpec }: Props) {
  const [spec, setSpec] = useState<RepairSpec>({ ...order.spec });
  const [staff, setStaff] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const save = () => {
    if (!staff.trim()) {
      setMessage("请填写经办技师");
      return;
    }
    const { order: next, changed } = changeSpec(order, spec, staff.trim());
    if (!changed.length) {
      setMessage("刃角、蜡型、修补说明均无变化，先前核对继续有效。");
      return;
    }
    onChangeSpec(next);
    setMessage("已记录变化：先前核对作废，工单退回「待复核」，旧快照保留。");
  };

  return (
    <section className="panel spec-card">
      <div className="heading">
        <div>
          <p>维修参数</p>
          <h2>刃角 · 蜡型 · 底板修补</h2>
        </div>
      </div>

      {order.status === "recheck" && (
        <div className="alert warning">
          刃角、蜡型或修补有变化，先前收板核对已作废。须重新核对固定器编号、孔位、附件后工单才能继续。
        </div>
      )}

      <div className="field-grid">
        <label className="field">
          <span>侧刃角</span>
          <input
            disabled={disabled}
            value={spec.edgeSide}
            onChange={(e) => setSpec({ ...spec, edgeSide: e.target.value })}
            placeholder="如：88°"
          />
        </label>
        <label className="field">
          <span>底刃角</span>
          <input
            disabled={disabled}
            value={spec.edgeBase}
            onChange={(e) => setSpec({ ...spec, edgeBase: e.target.value })}
            placeholder="如：1°"
          />
        </label>
        <label className="field">
          <span>打蜡类型</span>
          <select
            disabled={disabled}
            value={spec.waxType || WAX_TYPES[0]}
            onChange={(e) => setSpec({ ...spec, waxType: e.target.value })}
          >
            {WAX_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field wide">
          <span>底板损伤 / 修补说明</span>
          <textarea
            disabled={disabled}
            rows={2}
            value={spec.repairNote}
            onChange={(e) => setSpec({ ...spec, repairNote: e.target.value })}
          />
        </label>
      </div>

      {!disabled && (
        <div className="action-row">
          <label className="field staff-field">
            <span>经办技师 *</span>
            <input value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="记录参数变更的技师" />
          </label>
          <button className="primary" type="button" onClick={save}>
            保存参数（有变化则作废旧核对）
          </button>
        </div>
      )}
      {message && <div className="alert info">{message}</div>}
    </section>
  );
}
