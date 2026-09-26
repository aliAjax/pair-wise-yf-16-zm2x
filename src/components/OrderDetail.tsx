import { useState } from "react";
import type {
  Binding,
  CheckState,
  ConfirmMethod,
  Order,
  Verification,
} from "../types";
import { CONFIRM_METHODS, STATUS_LABEL } from "../types";
import { accessoryText, changedFields, fmtDateTime, fmtTime } from "../utils";

interface Props {
  order: Order;
  onBack: () => void;
  onSpecChange: (
    orderId: string,
    next: {
      edgeAngle: string;
      wax: string;
      repair: string;
      preference: string;
      reason: string;
      changedBy: string;
    }
  ) => void;
  onVerify: (orderId: string, v: Omit<Verification, "id" | "at">) => void;
  onPickup: (
    orderId: string,
    record: {
      staff: string;
      bindingCheck: CheckState;
      holesCheck: CheckState;
      accessoriesCheck: CheckState;
      bindingsNow: string;
      holesNow: string;
      presentNames: string;
      customerConfirmed: boolean;
      confirmMethod: ConfirmMethod;
      confirmedBy: string;
      note: string;
    }
  ) => void;
}

const checkLabel: Record<CheckState, string> = {
  ok: "一致",
  bad: "不符",
  unknown: "未核",
};

export default function OrderDetail({
  order,
  onBack,
  onSpecChange,
  onVerify,
  onPickup,
}: Props) {
  const spec = order.specVersions[order.specVersions.length - 1];
  const validV = [...order.verifications].reverse().find((v) => v.valid);
  const lastAttempt = order.pickups[order.pickups.length - 1];

  return (
    <div className="detail">
      <div className="heading">
        <div>
          <p>
            <button className="link-btn" onClick={onBack}>
              ← 工单列表
            </button>
          </p>
          <h2>
            {order.id} · {order.customer}
          </h2>
          <span className="sub">
            {order.brand} {order.length}cm · {order.shape} ·{" "}
            {order.phone || "未留电话"}
          </span>
        </div>
        <span className={`status-badge status-${order.status}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <IntakeSnapshot order={order} />
      <SpecPanel order={order} onSpecChange={onSpecChange} />
      <VerificationPanel
        order={order}
        validV={validV ?? null}
        onVerify={onVerify}
      />
      {(order.status === "ready" || order.status === "delivered") && (
        <PickupPanel order={order} lastAttempt={lastAttempt} onPickup={onPickup} />
      )}
      <HistoryPanel order={order} />
    </div>
  );
}

/* ---------- 收板快照 ---------- */

function IntakeSnapshot({ order }: { order: Order }) {
  const s = order.intake;
  return (
    <section className="card">
      <div className="card-head">
        <h3>收板快照（留档不可改）</h3>
        <small>{fmtDateTime(s.receivedAt)} · 经手 {s.staff}</small>
      </div>
      <div className="snapshot-grid">
        <div>
          <h4>固定器编号 / 孔位</h4>
          <ul className="plain-list">
            {s.bindings.map((b, i) => (
              <li key={i}>
                <b>{b.no}</b>
                <span>{b.position}</span>
              </li>
            ))}
          </ul>
          <p className="kv">
            <em>孔位状态：</em>
            {s.holes}
          </p>
        </div>
        <div>
          <h4>附件袋与附件</h4>
          <p>{accessoryText(s.accessories)}</p>
          <p className="kv">
            <em>确认方式：</em>
            {s.confirmMethod} · {s.confirmedBy}
          </p>
          {s.note && (
            <p className="kv">
              <em>收板备注：</em>
              {s.note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 维修方案 ---------- */

function SpecPanel({
  order,
  onSpecChange,
}: {
  order: Order;
  onSpecChange: Props["onSpecChange"];
}) {
  const spec = order.specVersions[order.specVersions.length - 1];
  const [editing, setEditing] = useState(false);
  const [edgeAngle, setEdgeAngle] = useState(spec.edgeAngle);
  const [wax, setWax] = useState(spec.wax);
  const [repair, setRepair] = useState(spec.repair);
  const [preference, setPreference] = useState(spec.preference);
  const [reason, setReason] = useState("");
  const [changedBy, setChangedBy] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!reason.trim()) return setError("请填写变更原因（将写入留痕记录）");
    if (!changedBy.trim()) return setError("请填写操作技师");
    onSpecChange(order.id, {
      edgeAngle: edgeAngle.trim() || "未设定",
      wax: wax.trim() || "未设定",
      repair: repair.trim() || "无",
      preference: preference.trim(),
      reason: reason.trim(),
      changedBy: changedBy.trim(),
    });
    setEditing(false);
    setError("");
    setReason("");
    setChangedBy("");
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>维修方案</h3>
        {!editing && (
          <button className="small" onClick={() => setEditing(true)}>
            登记参数变化
          </button>
        )}
      </div>

      {!editing ? (
        <div className="spec-grid">
          <SpecItem label="刃角" value={spec.edgeAngle} />
          <SpecItem label="打蜡类型" value={spec.wax} />
          <SpecItem label="底板修补" value={spec.repair} />
          <SpecItem label="客户偏好" value={spec.preference || "—"} />
        </div>
      ) : (
        <div className="change-box">
          <p className="rule-note warn">
            刃角、蜡型或修补任一变化，先前的完工核对立即作废，工单回到「待复核」；
            旧记录保留可查。仅客户偏好变化不会作废旧核对。
          </p>
          <div className="field-grid">
            <label>
              <span>刃角</span>
              <input value={edgeAngle} onChange={(e) => setEdgeAngle(e.target.value)} />
            </label>
            <label>
              <span>打蜡类型</span>
              <input value={wax} onChange={(e) => setWax(e.target.value)} />
            </label>
            <label>
              <span>底板修补</span>
              <input value={repair} onChange={(e) => setRepair(e.target.value)} />
            </label>
            <label>
              <span>客户偏好</span>
              <input
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
              />
            </label>
            <label>
              <span>变更原因 *</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="如 拆装固定器后重新调角 / 客户临时改蜡"
              />
            </label>
            <label>
              <span>操作技师 *</span>
              <input
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="inline-actions">
            <button onClick={() => setEditing(false)}>取消</button>
            <button className="primary" onClick={submit}>
              保存新版本并按规则作废核对
            </button>
          </div>
        </div>
      )}

      {order.specVersions.length > 1 && (
        <details className="versions">
          <summary>历史版本（{order.specVersions.length}）</summary>
          {[...order.specVersions].reverse().map((v, i) => (
            <div className="version-row" key={i}>
              <small>
                v{order.specVersions.length - i} · {fmtTime(v.changedAt)} ·{" "}
                {v.changedBy}
              </small>
              <p>
                刃角 {v.edgeAngle} ｜ 蜡 {v.wax} ｜ 修补 {v.repair}
              </p>
              <small className="muted">{v.reason}</small>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

/* ---------- 完工核验 ---------- */

function VerificationPanel({
  order,
  validV,
  onVerify,
}: {
  order: Order;
  validV: Verification | null;
  onVerify: Props["onVerify"];
}) {
  const [staff, setStaff] = useState("");
  const [bindingOk, setBindingOk] = useState(true);
  const [holesOk, setHolesOk] = useState(true);
  const [accessoriesOk, setAccessoriesOk] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const allOk = bindingOk && holesOk && accessoriesOk;
  const disabled = order.status === "delivered";

  function submit(passed: boolean) {
    if (!staff.trim()) return setError("请填写核验技师");
    if (passed && !allOk)
      return setError("三项未全部一致，不能放行通过；请先处理不符项。");
    onVerify(order.id, {
      staff: staff.trim(),
      bindingOk,
      holesOk,
      accessoriesOk,
      passed,
      note: note.trim(),
      valid: passed,
    });
    setStaff("");
    setNote("");
    setError("");
    setBindingOk(true);
    setHolesOk(true);
    setAccessoriesOk(true);
  }

  const voided = order.verifications.filter((v) => !v.valid && v.passed);
  const failed = order.verifications.filter((v) => !v.valid && !v.passed);

  return (
    <section className="card">
      <div className="card-head">
        <h3>完工核验（对照收板快照）</h3>
        {validV && <span className="pill pass">当前核对有效</span>}
        {!validV && order.status !== "delivered" && (
          <span className="pill warn">无有效核对</span>
        )}
      </div>

      {validV ? (
        <div className="result-box pass-box">
          <p>
            <b>✓ 核验通过</b> · {fmtDateTime(validV.at)} · {validV.staff}
          </p>
          <div className="check-row">
            <CheckTag ok={validV.bindingOk} label="固定器编号" />
            <CheckTag ok={validV.holesOk} label="孔位" />
            <CheckTag ok={validV.accessoriesOk} label="附件" />
          </div>
          {validV.note && <p className="muted">{validV.note}</p>}
          {order.status === "ready" && (
            <p className="muted">已通知客户取板，通知时间见下方取板核验区。</p>
          )}
          <p className="muted small">
            若之后施工中刃角、蜡型或修补发生变化，本核对将自动作废并保留记录。
          </p>
        </div>
      ) : disabled ? null : (
        <div className="change-box">
          <p className="rule-note">
            逐项核对实物与收板快照：固定器编号、安装孔位、附件袋及附件。三项全部一致且
            核验技师签字，才能通过放行、通知取板。
          </p>
          <div className="verify-checks">
            <CheckToggle
              label="固定器编号与收板一致"
              ok={bindingOk}
              onChange={setBindingOk}
            />
            <CheckToggle label="孔位与收板一致" ok={holesOk} onChange={setHolesOk} />
            <CheckToggle
              label="附件袋与附件齐套"
              ok={accessoriesOk}
              onChange={setAccessoriesOk}
            />
          </div>
          <div className="field-grid two-col">
            <label>
              <span>核验技师 *</span>
              <input value={staff} onChange={(e) => setStaff(e.target.value)} />
            </label>
            <label>
              <span>备注</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="不符项说明 / 处理方式"
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="inline-actions">
            <button onClick={() => submit(false)}>登记不通过（留在待复核）</button>
            <button className="primary" disabled={!allOk} onClick={() => submit(true)}>
              {allOk ? "核验通过，通知取板" : "存在不符项，不能放行"}
            </button>
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <details className="versions">
          <summary>未通过的核验记录（{failed.length}）</summary>
          {failed.map((v) => (
            <div className="result-box void-box" key={v.id}>
              <p>
                <b className="danger-text">核验不通过</b> · {fmtTime(v.at)} · {v.staff}
              </p>
              <div className="check-row">
                <CheckTag ok={v.bindingOk} label="固定器" />
                <CheckTag ok={v.holesOk} label="孔位" />
                <CheckTag ok={v.accessoriesOk} label="附件" />
              </div>
              {v.note && <small className="muted">{v.note}</small>}
            </div>
          ))}
        </details>
      )}

      {voided.length > 0 && (
        <details className="versions" open>
          <summary>已作废的旧核对（{voided.length}）</summary>
          {voided.map((v) => (
            <div className="result-box void-box" key={v.id}>
              <p>
                <s>
                  {v.passed ? "核验通过" : "核验不通过"} · {fmtTime(v.at)} · {v.staff}
                </s>
                <span className="pill void">已作废</span>
              </p>
              <small className="muted">{v.voidReason}</small>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function CheckTag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? "check-tag ok" : "check-tag bad"}>
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}

function CheckToggle({
  label,
  ok,
  onChange,
}: {
  label: string;
  ok: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={ok ? "check-toggle ok" : "check-toggle bad"}
      onClick={() => onChange(!ok)}
    >
      <span>{ok ? "✓ 一致" : "✕ 不符"}</span>
      <em>{label}</em>
    </button>
  );
}

/* ---------- 取板核验 ---------- */

function PickupPanel({
  order,
  lastAttempt,
  onPickup,
}: {
  order: Order;
  lastAttempt?: Order["pickups"][number];
  onPickup: Props["onPickup"];
}) {
  const delivered = order.status === "delivered";
  const [staff, setStaff] = useState("");
  const [bindingCheck, setBindingCheck] = useState<CheckState>("ok");
  const [holesCheck, setHolesCheck] = useState<CheckState>("ok");
  const [accessoriesCheck, setAccessoriesCheck] = useState<CheckState>("ok");
  const [bindingsNow, setBindingsNow] = useState(
    order.intake.bindings.map((b) => b.no).join("\n")
  );
  const [holesNow, setHolesNow] = useState(order.intake.holes);
  const [presentNames, setPresentNames] = useState(
    order.intake.accessories.map((a) => `${a.name} ×${a.qty}`).join("\n")
  );
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState<ConfirmMethod>("店内签字");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const allMatch =
    bindingCheck === "ok" && holesCheck === "ok" && accessoriesCheck === "ok";
  const canDeliver = allMatch && customerConfirmed && confirmedBy.trim() !== "";

  function submit(deliver: boolean) {
    if (!staff.trim()) return setError("请填写交付经手人");
    if (deliver) {
      if (!allMatch) return setError("固定器/孔位/附件未全部对上，不能交付。");
      if (!customerConfirmed)
        return setError("客户尚未确认匹配，不能交付。");
      if (!confirmedBy.trim()) return setError("请填写客户确认人。");
    }
    onPickup(order.id, {
      staff: staff.trim(),
      bindingCheck,
      holesCheck,
      accessoriesCheck,
      bindingsNow,
      holesNow,
      presentNames,
      customerConfirmed,
      confirmMethod,
      confirmedBy: confirmedBy.trim(),
      note: note.trim(),
    });
    setStaff("");
    setNote("");
    setConfirmedBy("");
    setError("");
    setCustomerConfirmed(false);
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>取板核验与交付</h3>
        <small>
          完工通知：{fmtDateTime(order.notifiedAt)}
          {delivered && ` · 交付 ${fmtDateTime(order.deliveredAt)}`}
        </small>
      </div>

      {order.missingItems.length > 0 && !delivered && (
        <div className="result-box void-box">
          <b>待补缺项清单：</b>
          <ul className="plain-list tight">
            {order.missingItems.map((m, i) => (
              <li key={i}>
                <span>
                  {m.name} ×{m.qty}
                </span>
              </li>
            ))}
          </ul>
          <small className="muted">缺项未补齐前，雪板留在「待取板」不可交付。</small>
        </div>
      )}

      {lastAttempt && (
        <div
          className={
            lastAttempt.delivered ? "result-box pass-box" : "result-box void-box"
          }
        >
          <p>
            <b>{lastAttempt.delivered ? "✓ 已交付" : "最近一次取板未完成"}</b> ·{" "}
            {fmtTime(lastAttempt.at)} · {lastAttempt.staff}
          </p>
          <div className="check-row">
            <span className={`check-tag ${lastAttempt.bindingCheck === "ok" ? "ok" : "bad"}`}>
              固定器 {checkLabel[lastAttempt.bindingCheck]}
            </span>
            <span className={`check-tag ${lastAttempt.holesCheck === "ok" ? "ok" : "bad"}`}>
              孔位 {checkLabel[lastAttempt.holesCheck]}
            </span>
            <span
              className={`check-tag ${lastAttempt.accessoriesCheck === "ok" ? "ok" : "bad"}`}
            >
              附件 {checkLabel[lastAttempt.accessoriesCheck]}
            </span>
          </div>
          {lastAttempt.missing.length > 0 && (
            <small>缺：{accessoryText(lastAttempt.missing)}</small>
          )}
          {lastAttempt.note && <p className="muted">{lastAttempt.note}</p>}
          {lastAttempt.delivered && (
            <small className="muted">
              客户确认匹配（{lastAttempt.confirmMethod} · {lastAttempt.confirmedBy}）
            </small>
          )}
        </div>
      )}

      {!delivered && (
        <div className="change-box">
          <p className="rule-note">
            取板时逐项对照：固定器编号、孔位、附件袋与附件。全部对上且客户确认匹配才可交付；
            有缺项或客户未确认时，雪板留在「待取板」，系统自动生成缺项清单。
          </p>
          <div className="tri-check">
            <TriCheck
              label="固定器编号"
              value={bindingCheck}
              onChange={setBindingCheck}
            />
            <TriCheck label="孔位" value={holesCheck} onChange={setHolesCheck} />
            <TriCheck
              label="附件袋/附件"
              value={accessoriesCheck}
              onChange={setAccessoriesCheck}
            />
          </div>
          <div className="field-grid">
            <label className="block-label">
              <span>实查固定器编号（每行一个）</span>
              <textarea
                rows={2}
                value={bindingsNow}
                onChange={(e) => setBindingsNow(e.target.value)}
              />
            </label>
            <label className="block-label">
              <span>实查孔位</span>
              <textarea
                rows={2}
                value={holesNow}
                onChange={(e) => setHolesNow(e.target.value)}
              />
            </label>
            <label className="block-label">
              <span>实到附件（每行 名称 ×数量）</span>
              <textarea
                rows={2}
                value={presentNames}
                onChange={(e) => setPresentNames(e.target.value)}
              />
            </label>
          </div>

          <label className="confirm-line">
            <input
              type="checkbox"
              checked={customerConfirmed}
              onChange={(e) => setCustomerConfirmed(e.target.checked)}
            />
            <span>
              客户已当面（或通过确认方式）核对固定器、孔位、附件，<b>确认匹配</b>
            </span>
          </label>
          <div className="chips">
            {CONFIRM_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                className={confirmMethod === m ? "chip active" : "chip"}
                onClick={() => setConfirmMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="field-grid two-col">
            <label>
              <span>客户确认人 *</span>
              <input
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                placeholder="客户本人 / 授权人"
              />
            </label>
            <label>
              <span>交付经手人 *</span>
              <input value={staff} onChange={(e) => setStaff(e.target.value)} />
            </label>
            <label className="block-label">
              <span>备注</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如 客户择日再来、缺件已下单补发"
              />
            </label>
          </div>

          {error && <p className="error">{error}</p>}
          <div className="inline-actions">
            <button onClick={() => submit(false)}>登记取板核对（留在待取）</button>
            <button className="primary" disabled={!canDeliver} onClick={() => submit(true)}>
              {canDeliver ? "全部对上，客户确认，交付" : "不满足交付条件"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function TriCheck({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CheckState;
  onChange: (v: CheckState) => void;
}) {
  const opts: CheckState[] = ["ok", "bad", "unknown"];
  return (
    <div className="tri-check-item">
      <em>{label}</em>
      <div className="seg">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            className={`seg-btn ${value === o ? `seg-${o} active` : ""}`}
            onClick={() => onChange(o)}
          >
            {checkLabel[o]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 客户历史（收板 & 交付快照） ---------- */

function HistoryPanel({ order }: { order: Order }) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>客户历史 · 收板与交付快照</h3>
        <small className="muted">全部记录只读留档，仅保存在本浏览器</small>
      </div>

      <div className="snapshot-compare">
        <div className="snap-col">
          <h4>① 收板快照</h4>
          <small>{fmtDateTime(order.intake.receivedAt)}</small>
          <ul className="plain-list tight">
            {order.intake.bindings.map((b, i) => (
              <li key={i}>
                <b>{b.no}</b>
                <span>{b.position}</span>
              </li>
            ))}
          </ul>
          <p className="kv">
            <em>孔位：</em>
            {order.intake.holes}
          </p>
          <p className="kv">
            <em>附件：</em>
            {accessoryText(order.intake.accessories)}
          </p>
          <p className="kv">
            <em>确认：</em>
            {order.intake.confirmMethod} · {order.intake.confirmedBy}
          </p>
        </div>

        <div className="snap-col">
          <h4>② 交付快照</h4>
          {order.status === "delivered" && order.pickups.length > 0 ? (
            (() => {
              const d = [...order.pickups].reverse().find((p) => p.delivered)!;
              return (
                <>
                  <small>{fmtDateTime(d.deliveredAt)}</small>
                  <div className="check-row">
                    <CheckTag ok={d.bindingCheck === "ok"} label="固定器" />
                    <CheckTag ok={d.holesCheck === "ok"} label="孔位" />
                    <CheckTag ok={d.accessoriesCheck === "ok"} label="附件" />
                  </div>
                  <p className="kv">
                    <em>实查固定器：</em>
                    {d.bindingsNow || "—"}
                  </p>
                  <p className="kv">
                    <em>实查孔位：</em>
                    {d.holesNow || "—"}
                  </p>
                  <p className="kv">
                    <em>实到附件：</em>
                    {d.presentNames || "—"}
                  </p>
                  <p className="kv">
                    <em>客户确认：</em>
                    {d.confirmMethod} · {d.confirmedBy}
                  </p>
                  <p className="kv">
                    <em>经手：</em>
                    {d.staff}
                  </p>
                </>
              );
            })()
          ) : (
            <p className="muted">尚未交付，交付时生成快照。</p>
          )}
        </div>
      </div>

      <h4 className="timeline-title">全程留痕</h4>
      <ol className="timeline">
        {order.timeline.map((e, i) => (
          <li key={i}>
            <span className="t-time">{fmtTime(e.at)}</span>
            <span className="t-text">{e.text}</span>
          </li>
        ))}
      </ol>

      {order.specVersions.length > 1 && (
        <details className="versions">
          <summary>参数变更差异</summary>
          {order.specVersions.slice(1).map((v, i) => {
            const prev = order.specVersions[i];
            const diffs = changedFields(prev, v);
            return (
              <div className="version-row" key={i}>
                <small>
                  v{i + 2} · {fmtTime(v.changedAt)} · {v.changedBy}
                </small>
                {diffs.map((d, j) => (
                  <p key={j}>
                    {d.label}：<s>{d.from || "空"}</s> → {d.to}
                  </p>
                ))}
                <small className="muted">{v.reason}</small>
              </div>
            );
          })}
        </details>
      )}
    </section>
  );
}
