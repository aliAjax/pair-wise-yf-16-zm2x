import type { CheckSnapshot } from "../types";
import { fmtTime } from "../domain";

interface Props {
  check: CheckSnapshot;
  compact?: boolean;
}

export function CheckCard({ check, compact }: Props) {
  return (
    <article className={`check-card ${check.voided ? "voided" : ""} ${compact ? "compact" : ""}`}>
      <header className="check-head">
        <div>
          <span className={`tag ${check.kind === "intake" ? "tag-blue" : "tag-purple"}`}>
            {check.kind === "intake" ? "收板核对" : "复核快照"}
          </span>
          {check.voided && <span className="tag tag-red">已作废 · 记录保留</span>}
        </div>
        <time>{fmtTime(check.at)}</time>
      </header>

      <dl className="kv-grid">
        <div>
          <dt>固定器编号</dt>
          <dd>
            {check.bindingBrand ? `${check.bindingBrand} · ` : ""}
            <b>{check.bindingSerial}</b>
          </dd>
        </div>
        <div>
          <dt>安装孔位</dt>
          <dd>{check.holePattern}</dd>
        </div>
        <div>
          <dt>安装位置 / 角度</dt>
          <dd>{check.mountPosition || "—"}</dd>
        </div>
        <div>
          <dt>确认方式</dt>
          <dd>
            {check.confirmMethod} · {check.confirmedBy}
          </dd>
        </div>
      </dl>

      {!compact && (
        <>
          <div className="acc-list">
            <span className="acc-title">随板附件</span>
            {check.accessories.map((a) => (
              <span className="pill" key={a.id}>
                {a.name} ×{a.qty}
              </span>
            ))}
            {check.accessories.length === 0 && <span className="muted">无附件</span>}
          </div>
          {(check.note || check.voidReason) && (
            <div className="check-note">
              {check.note && <p>备注：{check.note}</p>}
              {check.voidReason && (
                <p className="void-reason">
                  作废原因（{check.voidAt ? fmtTime(check.voidAt) : ""}）：{check.voidReason}
                </p>
              )}
            </div>
          )}
          <p className="muted staff-line">经办：{check.staff}</p>
        </>
      )}
    </article>
  );
}
