import { useState } from "react";
import type {
  Accessory,
  Binding,
  ConfirmMethod,
  IntakeSnapshot,
  Order,
} from "../types";
import { BOARD_SHAPES, CONFIRM_METHODS } from "../types";
import { uid } from "../storage";

interface Props {
  onCancel: () => void;
  onCreate: (order: Order) => void;
}

interface FormState {
  customer: string;
  phone: string;
  brand: string;
  length: string;
  shape: string;
  bindings: Binding[];
  holes: string;
  accessories: Accessory[];
  confirmMethod: ConfirmMethod;
  confirmedBy: string;
  staff: string;
  note: string;
  edgeAngle: string;
  wax: string;
  repair: string;
  preference: string;
}

const initial: FormState = {
  customer: "",
  phone: "",
  brand: "",
  length: "",
  shape: BOARD_SHAPES[0],
  bindings: [{ no: "", position: "" }, { no: "", position: "" }],
  holes: "",
  accessories: [{ name: "", qty: 1 }],
  confirmMethod: "店内签字",
  confirmedBy: "",
  staff: "",
  note: "",
  edgeAngle: "",
  wax: "",
  repair: "无",
  preference: "",
};

export default function IntakeForm({ onCancel, onCreate }: Props) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setBinding = (i: number, key: keyof Binding, value: string) =>
    setForm((f) => ({
      ...f,
      bindings: f.bindings.map((b, idx) =>
        idx === i ? { ...b, [key]: value } : b
      ),
    }));

  const setAccessory = (i: number, key: keyof Accessory, value: string) =>
    setForm((f) => ({
      ...f,
      accessories: f.accessories.map((a, idx) =>
        idx === i
          ? { ...a, [key]: key === "qty" ? Math.max(0, Number(value) || 0) : value }
          : a
      ),
    }));

  function submit() {
    const bindings = form.bindings.filter((b) => b.no.trim() || b.position.trim());
    const accessories = form.accessories.filter((a) => a.name.trim() && a.qty > 0);

    if (!form.customer.trim()) return setError("请填写客户姓名");
    if (!form.brand.trim() || !form.length.trim())
      return setError("请填写雪板品牌与长度");
    if (bindings.length === 0)
      return setError("至少登记 1 个固定器编号（固定器随板留店）");
    if (bindings.some((b) => !b.no.trim() || !b.position.trim()))
      return setError("固定器编号与安装孔位需逐项填写完整");
    if (!form.holes.trim()) return setError("请描述安装孔位状态");
    if (!form.confirmedBy.trim())
      return setError("请填写确认人（客户本人或授权代确认）");
    if (!form.staff.trim()) return setError("请填写收板经手人");

    const ts = Date.now();
    const intake: IntakeSnapshot = {
      bindings,
      holes: form.holes.trim(),
      accessories,
      confirmMethod: form.confirmMethod,
      confirmedBy: form.confirmedBy.trim(),
      staff: form.staff.trim(),
      receivedAt: ts,
      note: form.note.trim(),
    };
    const order: Order = {
      id: uid("ORD"),
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      brand: form.brand.trim(),
      length: form.length.trim(),
      shape: form.shape,
      status: "repairing",
      intake,
      specVersions: [
        {
          edgeAngle: form.edgeAngle.trim() || "未设定",
          wax: form.wax.trim() || "未设定",
          repair: form.repair.trim() || "无",
          preference: form.preference.trim(),
          changedAt: ts,
          changedBy: form.staff.trim(),
          reason: "收板时登记的初始方案",
        },
      ],
      verifications: [],
      pickups: [],
      missingItems: [],
      timeline: [
        {
          at: ts,
          text: `收板：固定器 ${bindings.length} 个、孔位、附件 ${accessories.length} 项已登记，${form.confirmMethod}由 ${form.confirmedBy.trim()} 确认`,
        },
      ],
    };
    onCreate(order);
  }

  return (
    <div className="detail">
      <div className="heading">
        <div>
          <p>第一步 · 收板登记</p>
          <h2>新收工单</h2>
        </div>
        <button onClick={onCancel}>返回列表</button>
      </div>
      <p className="rule-note">
        固定器与附件袋跟板留下。收板快照（固定器编号、孔位、附件、客户确认方式）一经保存即留档，
        作为完工与取板核验的唯一比对依据。
      </p>

      <section className="card">
        <h3>客户与雪板</h3>
        <div className="field-grid">
          <label>
            <span>客户姓名 *</span>
            <input
              value={form.customer}
              onChange={(e) => set("customer", e.target.value)}
              placeholder="如 林楠"
            />
          </label>
          <label>
            <span>联系电话</span>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="选填"
            />
          </label>
          <label>
            <span>雪板品牌/型号 *</span>
            <input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="如 Burton Custom"
            />
          </label>
          <label>
            <span>长度 (cm) *</span>
            <input
              value={form.length}
              onChange={(e) => set("length", e.target.value)}
              placeholder="如 156"
            />
          </label>
          <label>
            <span>板型</span>
            <select
              value={form.shape}
              onChange={(e) => set("shape", e.target.value)}
            >
              {BOARD_SHAPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>固定器编号与孔位（随板留店）*</h3>
        {form.bindings.map((b, i) => (
          <div className="row-edit" key={i}>
            <label className="grow">
              <span>{i === 0 ? "前" : "后"}固定器编号/序列号</span>
              <input
                value={b.no}
                onChange={(e) => setBinding(i, "no", e.target.value)}
                placeholder="如 BUR-MAL-77231"
              />
            </label>
            <label className="grow">
              <span>安装孔位</span>
              <input
                value={b.position}
                onChange={(e) => setBinding(i, "position", e.target.value)}
                placeholder="如 4×4 第3排孔 / EST 滑槽档位"
              />
            </label>
            <button
              className="icon-btn danger-text"
              disabled={form.bindings.length <= 1}
              onClick={() =>
                set(
                  "bindings",
                  form.bindings.filter((_, idx) => idx !== i)
                )
              }
            >
              删除
            </button>
          </div>
        ))}
        <button
          className="link-btn"
          onClick={() =>
            set("bindings", [...form.bindings, { no: "", position: "" }])
          }
        >
          + 添加固定器
        </button>
        <label className="block-label">
          <span>孔位状态描述 *</span>
          <textarea
            rows={2}
            value={form.holes}
            onChange={(e) => set("holes", e.target.value)}
            placeholder="螺丝孔数量、是否滑牙、滑槽是否变形等"
          />
        </label>
      </section>

      <section className="card">
        <h3>附件袋与随板附件</h3>
        {form.accessories.map((a, i) => (
          <div className="row-edit" key={i}>
            <label className="grow">
              <span>附件名称</span>
              <input
                value={a.name}
                onChange={(e) => setAccessory(i, "name", e.target.value)}
                placeholder="如 附件袋（含备用螺丝）"
              />
            </label>
            <label className="qty">
              <span>数量</span>
              <input
                type="number"
                min={1}
                value={a.qty}
                onChange={(e) => setAccessory(i, "qty", e.target.value)}
              />
            </label>
            <button
              className="icon-btn danger-text"
              onClick={() =>
                set(
                  "accessories",
                  form.accessories.filter((_, idx) => idx !== i)
                )
              }
            >
              删除
            </button>
          </div>
        ))}
        <button
          className="link-btn"
          onClick={() =>
            set("accessories", [...form.accessories, { name: "", qty: 1 }])
          }
        >
          + 添加附件
        </button>
      </section>

      <section className="card">
        <h3>初始维修方案（可登记，施工中允许变更）</h3>
        <div className="field-grid">
          <label>
            <span>刃角</span>
            <input
              value={form.edgeAngle}
              onChange={(e) => set("edgeAngle", e.target.value)}
              placeholder="如 侧刃88°/底刃1°"
            />
          </label>
          <label>
            <span>打蜡类型</span>
            <input
              value={form.wax}
              onChange={(e) => set("wax", e.target.value)}
              placeholder="如 低温蜡"
            />
          </label>
          <label>
            <span>底板修补</span>
            <input
              value={form.repair}
              onChange={(e) => set("repair", e.target.value)}
              placeholder="如 P-Tex 补划痕 12cm"
            />
          </label>
          <label>
            <span>客户偏好</span>
            <input
              value={form.preference}
              onChange={(e) => set("preference", e.target.value)}
              placeholder="如 弱咬雪"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>收板确认方式 *</h3>
        <div className="chips">
          {CONFIRM_METHODS.map((m) => (
            <button
              key={m}
              className={form.confirmMethod === m ? "chip active" : "chip"}
              onClick={() => set("confirmMethod", m)}
              type="button"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="field-grid two-col">
          <label>
            <span>确认人 *</span>
            <input
              value={form.confirmedBy}
              onChange={(e) => set("confirmedBy", e.target.value)}
              placeholder="客户本人签字 / 微信昵称等"
            />
          </label>
          <label>
            <span>收板经手人 *</span>
            <input
              value={form.staff}
              onChange={(e) => set("staff", e.target.value)}
              placeholder="前台/技师姓名"
            />
          </label>
        </div>
        <label className="block-label">
          <span>备注</span>
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="外观划痕、客户特别交代等"
          />
        </label>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="action-bar">
        <button onClick={onCancel}>取消</button>
        <button className="primary" onClick={submit}>
          保存收板快照，进入维修中
        </button>
      </div>
    </div>
  );
}
