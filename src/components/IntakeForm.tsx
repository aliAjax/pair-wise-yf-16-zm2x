import { useState } from "react";
import type { Accessory, CheckDraft, NewOrderDraft, RepairSpec } from "../types";
import {
  ACCESSORY_SUGGESTIONS,
  BOARD_TYPES,
  CONFIRM_METHODS,
  EMPTY_SPEC,
  WAX_TYPES,
  createOrder,
  uid,
} from "../domain";

interface Props {
  onCreate: (order: ReturnType<typeof createOrder>) => void;
}

function emptyAccessory(): Accessory {
  return { id: uid("acc"), name: "", qty: 1 };
}

const initialCheck = (): CheckDraft => ({
  kind: "intake",
  bindingBrand: "",
  bindingSerial: "",
  holePattern: "",
  mountPosition: "",
  accessories: [emptyAccessory()],
  confirmMethod: "现场签字",
  confirmedBy: "",
  staff: "",
});

export function IntakeForm({ onCreate }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [boardBrand, setBoardBrand] = useState("");
  const [boardLength, setBoardLength] = useState("");
  const [boardType, setBoardType] = useState<string>(BOARD_TYPES[0]);
  const [preference, setPreference] = useState("");
  const [spec, setSpec] = useState<RepairSpec>({ ...EMPTY_SPEC, waxType: WAX_TYPES[0] });

  const [check, setCheck] = useState<CheckDraft>(initialCheck);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const patchCheck = (patch: Partial<CheckDraft>) => {
    setCheck((c) => ({ ...c, ...patch }));
    setSaved(false);
  };

  const setAccessory = (id: string, patch: Partial<Accessory>) => {
    patchCheck({
      accessories: check.accessories.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const addAccessory = () =>
    patchCheck({ accessories: [...check.accessories, emptyAccessory()] });

  const removeAccessory = (id: string) =>
    patchCheck({ accessories: check.accessories.filter((a) => a.id !== id) });

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setBoardBrand("");
    setBoardLength("");
    setBoardType(BOARD_TYPES[0]);
    setPreference("");
    setSpec({ ...EMPTY_SPEC, waxType: WAX_TYPES[0] });
    setCheck(initialCheck());
    setErrors([]);
  };

  const submit = () => {
    const nextErrors: string[] = [];
    if (!customerName.trim()) nextErrors.push("客户姓名");
    if (!boardBrand.trim()) nextErrors.push("雪板品牌/型号");
    if (!check.bindingSerial.trim()) nextErrors.push("固定器编号");
    if (!check.holePattern.trim()) nextErrors.push("安装孔位");
    if (check.accessories.some((a) => !a.name.trim())) nextErrors.push("附件名称有空行");
    if (!check.confirmedBy.trim()) nextErrors.push("客户确认人");
    if (!check.staff.trim()) nextErrors.push("收板经办人");

    setErrors(nextErrors);
    if (nextErrors.length) return;

    const draft: NewOrderDraft = {
      customerName,
      customerPhone,
      boardBrand,
      boardLength,
      boardType,
      preference,
      spec,
      check,
    };
    onCreate(createOrder(draft));
    setSaved(true);
    reset();
  };

  const inputCls = (hasError?: boolean) => (hasError ? "input error" : "input");

  return (
    <section className="panel intake-panel">
      <div className="heading">
        <div>
          <p>收板登记</p>
          <h2>固定器、孔位、附件随板登记</h2>
        </div>
        <button className="primary" type="button" onClick={submit}>
          收板入库
        </button>
      </div>

      {errors.length > 0 && (
        <div className="alert danger">请补全必填项：{errors.join("、")}</div>
      )}
      {saved && <div className="alert success">收板成功：核对快照已留存，工单进入「维修中」。</div>}

      <div className="form-section">
        <h3>客户与雪板</h3>
        <div className="field-grid">
          <label className="field">
            <span>客户姓名 *</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="如：李先生"
            />
          </label>
          <label className="field">
            <span>联系电话</span>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="选填"
            />
          </label>
          <label className="field">
            <span>雪板品牌/型号 *</span>
            <input
              value={boardBrand}
              onChange={(e) => setBoardBrand(e.target.value)}
              placeholder="如：Burton Custom 156"
            />
          </label>
          <label className="field">
            <span>长度 (cm)</span>
            <input
              value={boardLength}
              onChange={(e) => setBoardLength(e.target.value)}
              placeholder="如：156"
            />
          </label>
          <label className="field">
            <span>板型</span>
            <select value={boardType} onChange={(e) => setBoardType(e.target.value)}>
              {BOARD_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>客户偏好</span>
            <input
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              placeholder="如：弱咬雪、固定器偏后"
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>维修计划（后续若改动，收板核对将作废）</h3>
        <div className="field-grid">
          <label className="field">
            <span>侧刃角</span>
            <input
              value={spec.edgeSide}
              onChange={(e) => setSpec({ ...spec, edgeSide: e.target.value })}
              placeholder="如：88°"
            />
          </label>
          <label className="field">
            <span>底刃角</span>
            <input
              value={spec.edgeBase}
              onChange={(e) => setSpec({ ...spec, edgeBase: e.target.value })}
              placeholder="如：1°"
            />
          </label>
          <label className="field">
            <span>打蜡类型</span>
            <select
              value={spec.waxType}
              onChange={(e) => setSpec({ ...spec, waxType: e.target.value })}
            >
              {WAX_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field wide">
            <span>底板损伤 / 修补计划</span>
            <textarea
              rows={2}
              value={spec.repairNote}
              onChange={(e) => setSpec({ ...spec, repairNote: e.target.value })}
              placeholder="如：底板划痕 12cm，计划补 P-Tex"
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>随板固定器与孔位 *</h3>
        <div className="field-grid">
          <label className="field">
            <span>固定器品牌</span>
            <input
              value={check.bindingBrand}
              onChange={(e) => patchCheck({ bindingBrand: e.target.value })}
              placeholder="如：Burton EST"
            />
          </label>
          <label className="field">
            <span>固定器编号 *</span>
            <input
              className={inputCls(!check.bindingSerial.trim())}
              value={check.bindingSerial}
              onChange={(e) => patchCheck({ bindingSerial: e.target.value })}
              placeholder="固定器本体序列号"
            />
          </label>
          <label className="field wide">
            <span>安装孔位 *</span>
            <input
              value={check.holePattern}
              onChange={(e) => patchCheck({ holePattern: e.target.value })}
              placeholder="如：4×2 标准孔位 / 间距 4×4cm，或 Channel 卡槽"
            />
          </label>
          <label className="field wide">
            <span>安装位置 / 角度</span>
            <input
              value={check.mountPosition}
              onChange={(e) => patchCheck({ mountPosition: e.target.value })}
              placeholder="如：参考线 +1 孔位，前脚 15° 后脚 -6°"
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <div className="section-head">
          <h3>附件袋与随板附件 *</h3>
          <button type="button" onClick={addAccessory} className="ghost">
            + 添加附件
          </button>
        </div>
        <div className="acc-editor">
          <div className="acc-row acc-head-row">
            <span>附件名称</span>
            <span>数量</span>
            <span />
          </div>
          {check.accessories.map((a) => (
            <div className="acc-row" key={a.id}>
              <input
                list="acc-suggestions"
                value={a.name}
                onChange={(e) => setAccessory(a.id, { name: e.target.value })}
                placeholder="如：附件袋、滑雪杖、备用螺丝"
              />
              <input
                type="number"
                min={1}
                value={a.qty}
                onChange={(e) => setAccessory(a.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
              />
              <button type="button" className="icon-btn" onClick={() => removeAccessory(a.id)}>
                移除
              </button>
            </div>
          ))}
          <datalist id="acc-suggestions">
            {ACCESSORY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="form-section">
        <h3>确认方式</h3>
        <div className="field-grid">
          <label className="field">
            <span>确认方式</span>
            <select
              value={check.confirmMethod}
              onChange={(e) => patchCheck({ confirmMethod: e.target.value as CheckDraft["confirmMethod"] })}
            >
              {CONFIRM_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>客户确认人 *</span>
            <input
              value={check.confirmedBy}
              onChange={(e) => patchCheck({ confirmedBy: e.target.value })}
              placeholder="当面确认并签字/拍照的客户"
            />
          </label>
          <label className="field">
            <span>收板经办人 *</span>
            <input
              value={check.staff}
              onChange={(e) => patchCheck({ staff: e.target.value })}
              placeholder="登记技师"
            />
          </label>
          <label className="field wide">
            <span>备注</span>
            <input
              value={check.note ?? ""}
              onChange={(e) => patchCheck({ note: e.target.value })}
              placeholder="外观瑕疵、客户特别叮嘱等"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
