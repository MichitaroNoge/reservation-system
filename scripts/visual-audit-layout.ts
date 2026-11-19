/** Runs inside the browser. Page overflow alone misses controls escaping a nested form. */
export function measureFormLayout() {
  const issues: { kind: string; form: string; control: string; pixels: number }[] = [];
  for (const form of document.querySelectorAll("form")) {
    if (form.closest('[aria-hidden="true"],[hidden]') || !form.getBoundingClientRect().width) continue;
    const box = form.getBoundingClientRect(), style = getComputedStyle(form);
    const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    for (const control of form.querySelectorAll<HTMLElement>("button,input,select,textarea")) {
      const rect = control.getBoundingClientRect();
      if (!rect.width || !rect.height || control.closest('[aria-hidden="true"],[hidden],.sr-only')) continue;
      let inScroller = false;
      for (let parent = control.parentElement; parent && parent !== form; parent = parent.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 1) inScroller = true;
      }
      if (inScroller) continue;
      const spill = Math.max(0, left - rect.left, rect.right - right);
      if (spill > 1) issues.push({ kind: "form-boundary", form: form.id || form.querySelector("h1,h2,h3")?.textContent?.trim() || "form", control: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName, pixels: Math.round(spill * 100) / 100 });
      const label = control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement ? control.labels?.[0] : null;
      if (label) {
        let field = control.parentElement;
        while (field && field !== form && !field.contains(label)) field = field.parentElement;
        if (field && field !== form && field.getBoundingClientRect().width) {
          const fieldBox = field.getBoundingClientRect(), fieldStyle = getComputedStyle(field);
          const fieldLeft = fieldBox.left + parseFloat(fieldStyle.paddingLeft) + parseFloat(fieldStyle.borderLeftWidth);
          const fieldRight = fieldBox.right - parseFloat(fieldStyle.paddingRight) - parseFloat(fieldStyle.borderRightWidth);
          const fieldSpill = Math.max(0, fieldLeft - rect.left, rect.right - fieldRight);
          if (fieldSpill > 1) issues.push({ kind: "field-boundary", form: form.id || "form", control: label.textContent?.trim().slice(0, 90) || control.tagName, pixels: Math.round(fieldSpill * 100) / 100 });
        }
      }
    }
    const buttons = [...form.querySelectorAll("button")];
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      if (buttons[i].parentElement !== buttons[j].parentElement) continue;
      const a = buttons[i].getBoundingClientRect(), b = buttons[j].getBoundingClientRect();
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 1 && overlapY > 1) issues.push({ kind: "sibling-overlap", form: form.id || "form", control: `${buttons[i].textContent?.trim()} / ${buttons[j].textContent?.trim()}`, pixels: Math.round(overlapX * 100) / 100 });
    }
  }
  return issues;
}
