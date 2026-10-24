// ============================================================
// MansaRent — ZeptoMail (email transactionnel via API REST)
// Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
// ============================================================

// Hôte API selon la région du compte Zoho : api.zeptomail.com (US), .ca, .eu, .in, .com.au…
// Lu à chaque envoi pour que les réglages de l'admin s'appliquent sans redémarrage.
const zeptoUrl = () => `https://${process.env.ZEPTOMAIL_HOST || "api.zeptomail.com"}/v1.1/email`;
const from = () => ({
  address: process.env.MAIL_FROM || "noreply@mansarent.com",
  name: process.env.MAIL_FROM_NAME || "MansaRent",
});

function headers() {
  // ZeptoMail attend "Zoho-enczapikey <clé>" — on ajoute le préfixe s'il manque.
  const key = (process.env.ZEPTOMAIL_API_KEY || "").trim();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: /^Zoho-enczapikey\s/i.test(key) ? key : `Zoho-enczapikey ${key}`,
  };
}

async function send({ to, subject, html, text }) {
  // Mode dev : sans clé, on log au lieu d'envoyer
  if (!process.env.ZEPTOMAIL_API_KEY) {
    console.log(`[mail:demo] to=${to} subject=${subject}`);
    return { demo: true };
  }
  const body = {
    from: from(),
    to: [{ email_address: { address: to } }],
    subject,
    htmlbody: html || `<p>${text || subject}</p>`,
    ...(text ? { textbody: text } : {}),
  };
  const r = await fetch(zeptoUrl(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ZeptoMail: ${j?.message || r.statusText}`);
  return j;
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Gabarit commun : en-tête MansaRent + bouton d'action (compatible clients mail).
function layout({ title, body, cta, link }) {
  const button = cta && link
    ? `<p style="margin:28px 0"><a href="${esc(link)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;display:inline-block">${esc(cta)}</a></p>
       <p style="font-size:12px;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien :<br><a href="${esc(link)}" style="color:#0f766e;word-break:break-all">${esc(link)}</a></p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827">
    <div style="padding:20px 0;font-size:22px;font-weight:800"><span style="color:#0f766e">Mansa</span><span style="color:#d97706">Rent</span></div>
    <h2 style="margin:0 0 12px">${esc(title)}</h2>
    <div style="font-size:15px;line-height:1.6;color:#374151">${body}</div>
    ${button}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 12px">
    <p style="font-size:12px;color:#9ca3af">MansaRent · Trouvez. Louez. Emménagez. · Guinée</p>
  </div>`;
}

export const Mailer = {
  welcome(to, name) {
    return send({
      to,
      subject: "Bienvenue sur MansaRent 🎉",
      html: `<h2>Bienvenue ${name} !</h2><p>Votre compte est créé. Vous bénéficiez de <b>30 jours d'essai gratuit</b> pour publier vos annonces.</p><p>Trouvez. Louez. Emménagez.</p>`,
      text: `Bienvenue ${name} ! Votre compte est créé avec 30 jours d'essai gratuit.`,
    });
  },
  passwordReset(to, link, name = "") {
    return send({
      to,
      subject: "Réinitialisez votre mot de passe MansaRent",
      html: layout({
        title: "Mot de passe oublié ?",
        body: `<p>Bonjour ${esc(name)},</p><p>Nous avons reçu une demande de réinitialisation du mot de passe de votre compte MansaRent. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est valable <b>1 heure</b> et ne fonctionne qu'une seule fois.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre mot de passe reste inchangé.</p>`,
        cta: "Choisir un nouveau mot de passe",
        link,
      }),
      text: `Bonjour ${name}, réinitialisez votre mot de passe MansaRent (lien valable 1 h) : ${link}\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    });
  },
  passwordChanged(to, name = "", appUrl = "") {
    const when = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Conakry" });
    return send({
      to,
      subject: "Votre mot de passe MansaRent a été modifié ✅",
      html: layout({
        title: "Mot de passe modifié",
        body: `<p>Bonjour ${esc(name)},</p><p>Le mot de passe de votre compte MansaRent a bien été modifié le <b>${esc(when)}</b> (heure de Conakry).</p><p><b>Ce n'était pas vous ?</b> Utilisez immédiatement « Mot de passe oublié » sur la page de connexion pour reprendre le contrôle de votre compte, puis contactez-nous.</p>`,
        cta: appUrl ? "Se connecter" : "",
        link: appUrl,
      }),
      text: `Bonjour ${name}, le mot de passe de votre compte MansaRent a été modifié le ${when}. Si ce n'était pas vous, utilisez « Mot de passe oublié » immédiatement.`,
    });
  },
  verificationApproved(to, name) {
    return send({
      to,
      subject: "Votre compte MansaRent est vérifié ✅",
      html: `<p>Bonjour ${esc(name)},</p><p>Votre profil a été <b>vérifié</b> par l'équipe MansaRent. Vous pouvez maintenant publier et gérer vos annonces depuis votre tableau de bord.</p>`,
      text: `Bonjour ${name}, votre profil MansaRent est vérifié. Vous pouvez publier vos annonces.`,
    });
  },
  verificationRejected(to, name, reason) {
    return send({
      to,
      subject: "Vérification MansaRent : informations à corriger",
      html: `<p>Bonjour ${esc(name)},</p><p>Nous n'avons pas pu valider votre profil pour la raison suivante :</p><blockquote>${esc(reason)}</blockquote><p>Corrigez vos informations depuis votre tableau de bord et soumettez-les à nouveau.</p>`,
      text: `Bonjour ${name}, votre profil n'a pas été validé : ${reason}. Corrigez-le depuis votre tableau de bord.`,
    });
  },
  newMessage(to, senderName, propertyTitle) {
    return send({
      to,
      subject: `Nouveau message de ${senderName}`,
      html: `<p><b>${senderName}</b> vous a écrit au sujet de « ${propertyTitle} ». Connectez-vous pour répondre.</p>`,
      text: `${senderName} vous a écrit au sujet de « ${propertyTitle} ».`,
    });
  },
};
