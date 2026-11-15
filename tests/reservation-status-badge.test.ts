import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { reservationStatuses, reservationStatusLabel } from "../lib/domain";
import { ReservationStatusBadge } from "../components/ui/reservation-status-badge";

test("all persisted reservation states have readable text and a decorative status marker", () => {
  for (const status of reservationStatuses) {
    const label = reservationStatusLabel(status);
    const markup = renderToStaticMarkup(createElement(ReservationStatusBadge, { status }, label));
    assert.ok(markup.includes(label), `Missing label for ${status}`);
    assert.match(markup, /data-ui="status-badge"/);
    assert.match(markup, /aria-hidden="true"/);
    assert.doesNotMatch(markup, /undefined/);
  }
});

test("contextual reservation labels and accessibility attributes are retained", () => {
  const markup = renderToStaticMarkup(createElement(ReservationStatusBadge, { status: "temporary_confirmed", "aria-label": "期限切れの仮予約" }, "仮予約確定（期限切れ）"));
  assert.match(markup, /aria-label="期限切れの仮予約"/);
  assert.match(markup, /仮予約確定（期限切れ）/);
});
