(() => {
  const get = id => document.getElementById(id);
  let link = '', expires = 0, epoch = 0;
  get('closeGuestQR').onclick = () => get('guestDialog').close();
  window.addEventListener('contact-auth-cleared', () => {
    epoch++; link = ''; expires = 0; get('guestDialog').close();
    get('guestCanvas').hidden = true; get('copyGuestLink').disabled = true;
  });
  get('guestQR').onclick = async () => {
    const current = epoch;
    get('guestDialog').showModal();
    get('guestQRStatus').textContent = 'Preparing your QR code…';
    get('guestQR').disabled = true;
    get('guestCanvas').hidden = true; get('copyGuestLink').disabled = true;
    try {
      if (!link || expires <= Date.now()) {
        const result = await window.contactApi('createGuestLink', {});
        if (current !== epoch) return;
        link = result.link; expires = result.expires;
      }
      window.drawContactQR(get('guestCanvas'), link);
      get('guestCanvas').hidden = false; get('copyGuestLink').disabled = false;
      get('guestQRStatus').textContent = 'Details save to your contacts. Valid until ' + new Date(expires).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '.';
    } catch (error) { if (current === epoch) get('guestQRStatus').textContent = error.message; }
    finally { get('guestQR').disabled = false; }
  };
  get('copyGuestLink').onclick = async () => {
    try { await navigator.clipboard.writeText(link); get('guestQRStatus').textContent = 'Link copied.'; }
    catch { get('guestQRStatus').textContent = 'Could not copy the link. Please scan the QR code.'; }
  };
})();
