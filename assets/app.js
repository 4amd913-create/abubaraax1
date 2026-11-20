(() => {
  'use strict';
  const config = window.FAR3ON_CONFIG || {};
  const byId = (id) => document.getElementById(id);
  const year = byId('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Populate contact actions from one public configuration source.
  const wa = String(config.whatsappNumber || '').replace(/\D/g, '');
  const phone = String(config.phoneInternational || '').trim();
  const phoneDisplay = String(config.phoneDisplay || '').trim();
  const emailAddress = String(config.contactEmail || '').trim();
  if (wa.length >= 8) {
    document.querySelectorAll('[data-contact-whatsapp]').forEach((link) => {
      link.href = `https://wa.me/${wa}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }
  if (phone) {
    document.querySelectorAll('[data-contact-phone]').forEach((link) => { link.href = `tel:${phone}`; });
  }
  if (phoneDisplay) {
    document.querySelectorAll('[data-contact-number]').forEach((node) => { node.textContent = phoneDisplay; });
  }
  if (emailAddress && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    document.querySelectorAll('[data-contact-email-link]').forEach((link) => { link.href = `mailto:${emailAddress}`; });
    document.querySelectorAll('[data-contact-email]').forEach((node) => { node.textContent = emailAddress; });
  }

  const menuButton = byId('menuToggle');
  const nav = byId('navLinks');
  if (menuButton && nav) {
    const closeMenu = () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'فتح القائمة');
      menuButton.textContent = '☰';
    };
    menuButton.addEventListener('click', () => {
      const opened = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(opened));
      menuButton.setAttribute('aria-label', opened ? 'إغلاق القائمة' : 'فتح القائمة');
      menuButton.textContent = opened ? '×' : '☰';
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const form = byId('requestForm');
  if (!form) return;
  const result = byId('formResult');
  if (!result) return;

  const queryPlan = new URLSearchParams(window.location.search).get('plan');
  const planMap = { starter: 'Starter', business: 'Business', performance: 'Performance' };
  if (queryPlan && planMap[queryPlan] && form.elements.plan) {
    form.elements.plan.value = planMap[queryPlan];
  }

  const makeMessage = (data) => [
    `استفسار جديد — ${config.brandName || 'FAR3ON VPS'}`,
    '--------------------------------',
    `الاسم: ${data.name}`,
    `رقم واتساب: ${data.phone}`,
    `البريد الإلكتروني: ${data.email || 'لم يذكر'}`,
    `الباقة/المواصفات: ${data.plan}`,
    `نظام التشغيل: ${data.os}`,
    `مركز البيانات: ${data.region}`,
    `مدة الاستخدام: ${data.term}`,
    `تفاصيل إضافية: ${data.notes || 'لا توجد'}`,
    '--------------------------------',
    'هذا استفسار مبدئي، وأرجو تأكيد التوفر والسعر والشروط قبل أي دفع.'
  ].join('\n');

  const showResult = (message, actions = []) => {
    result.hidden = false;
    result.replaceChildren();
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    result.appendChild(paragraph);
    actions.forEach(({ label, onClick, className = 'result-action' }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', onClick);
      result.appendChild(button);
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const rawValues = Object.fromEntries(new FormData(form).entries());
    const values = Object.fromEntries(Object.entries(rawValues).map(([key, value]) => [
      key, typeof value === 'string' ? value.trim() : value
    ]));
    const message = makeMessage(values);
    const wa = String(config.whatsappNumber || '').replace(/\D/g, '');
    const email = String(config.contactEmail || '').trim();

    if (wa.length >= 8) {
      const target = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
      showResult('تم تجهيز الرسالة. افتح واتساب لمراجعتها ثم اضغط إرسال بنفسك.', [
        { label: 'فتح واتساب ومراجعة الطلب', className: 'result-action result-primary', onClick: () => window.location.assign(target) },
        { label: 'نسخ الرسالة', onClick: () => copyMessage(message) }
      ]);
      return;
    }
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const subject = encodeURIComponent(`استفسار خادم VPS — ${config.brandName || 'FAR3ON VPS'}`);
      const body = encodeURIComponent(message);
      const target = `mailto:${email}?subject=${subject}&body=${body}`;
      showResult('تم تجهيز الرسالة. افتح تطبيق البريد لمراجعتها وإرسالها.', [
        { label: 'فتح تطبيق البريد', className: 'result-action result-primary', onClick: () => window.location.assign(target) },
        { label: 'نسخ الرسالة', onClick: () => copyMessage(message) }
      ]);
      return;
    }
    showResult('لم تُضف وسيلة تواصل بعد. يمكنك نسخ الطلب أو تنزيله وإرساله يدويًا. أضف رقم واتساب أو بريدًا فعليًا في assets/config.js لتفعيل هذه الخيارات.', [
      { label: 'نسخ نص الطلب', className: 'result-action result-primary', onClick: () => copyMessage(message) },
      { label: 'تنزيل الطلب كملف TXT', onClick: () => downloadMessage(message) }
    ]);
  });

  async function copyMessage(message) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(message);
      showResult('تم نسخ نص الطلب. يمكنك لصقه في وسيلة التواصل المناسبة.');
    } catch {
      const area = document.createElement('textarea');
      area.value = message;
      area.setAttribute('readonly', '');
      area.className = 'clipboard-fallback';
      document.body.appendChild(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      area.remove();
      showResult(copied ? 'تم نسخ نص الطلب.' : 'تعذر النسخ التلقائي. استخدم زر التنزيل لحفظ الطلب.');
    }
  }

  function downloadMessage(message) {
    const blob = new Blob([message], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'far3on-vps-inquiry.txt';
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
