"use client";
import { Button } from "@/components/ui/button";
import {
  defaultPaymentCondition,
  paymentConditionLabel,
  paymentConditions
} from "@/lib/domain";
import {
  type Dispatch,
  type SetStateAction
} from "react";
import { Icon } from "./components/common";
import {
  STATUS,
  VISIT_MENU_NAME
} from "./constants";
import type {
BookingForm,
Menu,
Reservation,
Status
} from "./types";


const isConfirmedReservationChangeRequest = (reservation: Reservation) =>
  reservation.status === STATUS.confirmedRequested &&
  reservation.requestType === "confirmed_from_temporary";


const groupTypeOptions = [
  "保育園・幼稚園",
  "小学校",
  "中学校",
  "高等学校",
  "専門学校",
  "大学・短期大学",
  "その他教育機関",
  "企業・法人",
  "社員旅行",
  "研修・視察",
  "自治体・行政",
  "自治会・町内会",
  "スポーツ団体",
  "文化・サークル",
  "福祉施設",
  "医療関係",
  "宗教団体",
  "その他団体",
  "その他",
];


const paymentConditionOptions = paymentConditions.map((value) => ({
  value,
  label: paymentConditionLabel(value),
}));


const isGroupBooking = (form: Pick<BookingForm, "bookingType">) =>
  form.bookingType === "travel_agency_group";


const emptyReservationForm = (status: Status): BookingForm => ({
  menuItems: [],
  date: "",
  startTime: "",
  people: 0,
  name: "",
  email: "",
  phone: "",
  address: "",
  accountType: "individual",
  bookingType: "individual",
  tcCount: 0,
  dgCount: 0,
  paymentCondition: defaultPaymentCondition,
  remarks: "",
  status,
});


function MenuPicker({
  menuCatalog,
  selected,
  onChange,
  loading = false,
  error = "",
  onRetry,
}: {
  menuCatalog: Menu[];
  selected: string[];
  onChange: (items: string[]) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const toggle = (name: string) => {
    if (name === VISIT_MENU_NAME) {
      onChange(selected.includes(name) ? [] : [name]);
      return;
    }
    const withoutVisitMenu = selected.filter(
      (item) => item !== VISIT_MENU_NAME,
    );
    onChange(
      selected.includes(name)
        ? withoutVisitMenu.filter((item) => item !== name)
        : [...withoutVisitMenu, name],
    );
  };
  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="mb-3 text-sm font-medium">メニュー <span className="ml-2 text-xs font-normal text-muted-foreground">複数選択可・任意</span></legend>
      {loading ? <p role="status" className="py-4 text-sm text-muted-foreground">メニューを読み込み中…</p> : error ? <div role="alert" className="flex flex-wrap items-center gap-3 py-3 text-sm text-destructive"><p>{error}</p>{onRetry && <Button type="button" variant="outline" onClick={onRetry}>再読み込み</Button>}</div> : menuCatalog.length === 0 ? <p role="status" className="py-4 text-sm text-muted-foreground">現在選択できるメニューはありません。メニュー未確定のままお進みいただけます。</p> : <div className="menu-check-grid">
      {menuCatalog.map((menu) => (
        <button
          type="button"
          key={menu.name}
          aria-pressed={selected.includes(menu.name)}
          className={selected.includes(menu.name) ? "selected" : ""}
          onClick={() => toggle(menu.name)}
        >
          <span>{selected.includes(menu.name) && <Icon name="check" />}</span>
          <h3>{menu.name}</h3>
          <p>{menu.description}</p>
          <div>
            <strong>
              {"¥"}
              {menu.price.toLocaleString()}
            </strong>
          </div>
        </button>
      ))}
    </div>}
    </fieldset>
  );
}


function GroupReservationContactFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        予約担当者名
        <input
          value={form.bookingContactName ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              bookingContactName: event.target.value,
              contactPersonName: event.target.value,
            }))
          }
        />
      </label>
      <label>
        当日責任者名
        <input
          value={form.dayContactName ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dayContactName: event.target.value,
            }))
          }
        />
      </label>
      <label>
        当日責任者携帯番号
        <input
          value={form.dayContactPhone ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dayContactPhone: event.target.value,
            }))
          }
        />
      </label>
    </div>
  );
}


function GroupReservationPeopleFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        T/C
        <input
          type="number"
          min="0"
          max="999"
          value={form.tcCount ?? 0}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              tcCount: Number(event.target.value),
            }))
          }
        />
        <small>
          添乗員・通訳ガイド様の現地でのお食事。（同食、同額となります。）
        </small>
      </label>
      <label>
        D/G
        <input
          type="number"
          min="0"
          max="999"
          value={form.dgCount ?? 0}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              dgCount: Number(event.target.value),
            }))
          }
        />
        <small>
          ドライバー・ガイド様の持ち帰り弁当1,000円（税込）（店舗にとりに来ていただくようになります。）
        </small>
      </label>
    </div>
  );
}


function GroupReservationFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="group-reservation-fields">
      <p className="section-label">団体情報</p>
      <div className="drawer-form single">
        <label>
          団体名
          <input
            value={form.groupName ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          団体ふりがな
          <input
            value={form.groupNameKana ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupNameKana: event.target.value,
              }))
            }
          />
        </label>
        <label>
          団体種別
          <select
            value={form.groupType ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                groupType: event.target.value,
              }))
            }
          >
            <option value="">選択してください</option>
            {groupTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {form.groupType === "その他" && (
          <label>
            団体種別 その他
            <input
              value={form.groupTypeOther ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  groupTypeOther: event.target.value,
                }))
              }
            />
          </label>
        )}
      </div>
    </div>
  );
}


function PaymentAndRemarksFields({
  form,
  setForm,
}: {
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
}) {
  return (
    <div className="drawer-form single">
      <label>
        支払条件
        <select
          value={form.paymentCondition ?? defaultPaymentCondition}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              paymentCondition: event.target
                .value as BookingForm["paymentCondition"],
            }))
          }
        >
          {paymentConditionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        備考
        <textarea
          value={form.remarks ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, remarks: event.target.value }))
          }
        />
      </label>
    </div>
  );
}


type CustomerPortalMode =
  | "home"
  | "login"
  | "register"
  | "account"
  | "settings"
  | "emailChange"
  | "accountDeletion"
  | "reservation"
  | "confirmedChange"
  | "change"
  | "cancellation";
export { emptyReservationForm,GroupReservationContactFields,GroupReservationFields,GroupReservationPeopleFields,groupTypeOptions,isConfirmedReservationChangeRequest,isGroupBooking,MenuPicker,PaymentAndRemarksFields,paymentConditionOptions,type CustomerPortalMode };
