import { APP_NAME, CONTACT_EMAIL, DEVELOPER_NAME } from "./contact.js";
import { HTML_LANG, LOCALES, type Locale } from "./locale.js";

/** Páginas públicas exigidas pela Google Play. Rota em PT para os 3 idiomas, como as demais rotas do app. */
export const LEGAL_PATHS = {
  privacy: "/privacidade",
  terms: "/termos",
  deleteAccount: "/excluir-conta",
} as const;

export type LegalPage = keyof typeof LEGAL_PATHS;

/**
 * Cada afirmação daqui corresponde a uma regra do código ou a uma decisão do dono: mudou a regra, muda o texto.
 * Texto puro (o render escapa); `{email}`, `{login}` e `{deleteLink}` viram links.
 */
const PT = {
  back: "Voltar para a Estante",
  languageLabel: "Idioma",
  otherPagesLabel: "Páginas legais",
  privacyNav: "Política de privacidade",
  termsNav: "Termos de uso",
  deleteNav: "Excluir conta",
  updated: "Última atualização: 9 de novembro de 2026",
  contactLine: "Contato: {email}",

  privacyTitle: "Política de privacidade",
  privacyDescription: `Quais dados a ${APP_NAME} guarda, quem vê cada um e como excluir sua conta.`,
  privacyIntro: `Esta política explica quais dados a ${APP_NAME} guarda, quem pode vê-los e o que acontece quando você exclui a conta.`,
  whoTitle: "Quem responde pelo app",
  whoBody: `A ${APP_NAME} é desenvolvida por ${DEVELOPER_NAME}. Contato: {email}.`,
  collectTitle: "O que guardamos",
  collectGoogle: "Da sua conta Google: o identificador da conta (sub), o e-mail, o nome e a foto.",
  collectApp: "Do que você registra no app: estante, nota, resenha, datas de leitura, página atual, comentários, amizades e convites.",
  purposeTitle: "Para que usamos",
  purposeBody: "Para identificar sua conta, guardar sua estante e mostrar aos seus amigos o que está descrito na próxima seção.",
  friendsTitle: "O que seus amigos veem",
  friendsSee: "Seus amigos veem os livros em Lendo e Lidos, com ano de leitura e página atual; seus comentários públicos; o título e os autores de livros cadastrados à mão; seu nome e sua foto.",
  friendsPrivate: "Sua nota, sua resenha, suas datas de leitura e seus comentários privados não saem da sua conta.",
  friendsEmail: "Seu e-mail nunca vai para os seus amigos.",
  cookiesTitle: "Cookies",
  cookieSid: "sid: mantém você na conta, por 30 dias.",
  cookieLang: "lang: guarda o idioma escolhido, por 1 ano.",
  cookieState: "oauth_state: protege o login com o Google, por 10 minutos.",
  servicesTitle: "Outros serviços",
  serviceSearch: "O termo que você busca vai do nosso servidor para o Google Books ou para a Open Library, sem o seu identificador de usuário.",
  serviceCovers: "As capas vêm direto do seu aparelho, do Google Books ou da Open Library. Essas fontes veem o seu endereço IP.",
  serviceCloudflare: "O tráfego passa pela Cloudflare, que vê o seu endereço IP e o seu país.",
  serviceNone: "Não usamos analytics e não exibimos anúncios.",
  deviceTitle: "No seu aparelho",
  deviceBody: "Ficam no aparelho um convite de amizade por até 1 hora, rascunhos de edição e caches de capas e sinopses. Tudo isso é limpo quando você sai da conta.",
  securityTitle: "Segurança",
  securityBody: "A conexão usa HTTPS e o cookie de sessão é HttpOnly, fora do alcance de scripts da página.",
  retentionTitle: "Por quanto tempo guardamos",
  retentionBody: "Os dados ficam guardados enquanto a conta existir.",
  backupRetention: "Dados apagados podem continuar em backups por até 30 dias.",
  retentionReport: "Uma denúncia aberta guarda uma cópia do comentário denunciado, mesmo se o autor o apagar. Essa cópia some se o autor excluir a conta.",
  retentionBan: "Uma conta banida fica retida para impedir a volta da pessoa.",
  deletionTitle: "Exclusão da conta",
  deletionDeleted: "A exclusão apaga a conta, a estante, os comentários, as amizades, os convites e os livros cadastrados à mão.",
  deletionKept: "Os livros do catálogo (Google Books e Open Library) ficam, sem vínculo com você.",
  deletionHow: "Como pedir: {deleteLink}.",

  termsTitle: "Termos de uso",
  termsDescription: `Quem pode usar a ${APP_NAME}, o que é proibido, como denunciar e como falar com o desenvolvedor.`,
  termsAgeTitle: "Quem pode usar",
  termsAgeBody: `A ${APP_NAME} é para pessoas com 13 anos ou mais.`,
  termsForbiddenTitle: "O que é proibido",
  termsForbiddenIntro: "Nos comentários e no nome da conta, não publique:",
  termsForbiddenHarassment: "assédio",
  termsForbiddenHate: "ódio",
  termsForbiddenThreat: "ameaça",
  termsForbiddenSexual: "conteúdo sexual",
  termsForbiddenIllegal: "conteúdo ilegal",
  termsForbiddenSpam: "spam",
  termsForbiddenPersonal: "dados de terceiros",
  termsReportTitle: "Denúncia e bloqueio",
  termsReportBody: "No app, você pode denunciar um comentário ou um amigo e bloquear um amigo.",
  termsModerationTitle: "Moderação",
  termsModerationBody: "A moderação pode remover comentários e banir contas.",
  termsContactTitle: "Contato",
  termsContactBody: "Fale pelo {email}, inclusive para pedir a remoção de conteúdo ou tratar de direitos sobre o catálogo.",

  deleteTitle: "Excluir conta",
  deleteDescription: `Como excluir sua conta da ${APP_NAME}, de ${DEVELOPER_NAME}: o que é apagado e o que fica.`,
  deleteIntro: `Como excluir sua conta da ${APP_NAME}, app de ${DEVELOPER_NAME}.`,
  deletePathTitle: "Pelo site, sem reinstalar o app",
  deleteStep1: "Entre pela web em {login}.",
  deleteStep2: "Abra o Perfil.",
  deleteStep3: "Toque em Excluir conta e confirme.",
  deleteEmailTitle: "Por e-mail",
  deleteEmailBody: "Se preferir, peça pelo {email}. A resposta vem em até 30 dias.",
  deleteGoneTitle: "O que é apagado",
  deleteKeptTitle: "O que fica",
};

export type LegalKey = keyof typeof PT;

const EN: Record<LegalKey, string> = {
  back: "Back to Estante",
  languageLabel: "Language",
  otherPagesLabel: "Legal pages",
  privacyNav: "Privacy policy",
  termsNav: "Terms of use",
  deleteNav: "Delete account",
  updated: "Last updated: November 9, 2026",
  contactLine: "Contact: {email}",

  privacyTitle: "Privacy policy",
  privacyDescription: `What data ${APP_NAME} keeps, who sees it and how to delete your account.`,
  privacyIntro: `This policy explains what data ${APP_NAME} keeps, who can see it and what happens when you delete your account.`,
  whoTitle: "Who is responsible for the app",
  whoBody: `${APP_NAME} is developed by ${DEVELOPER_NAME}. Contact: {email}.`,
  collectTitle: "What we keep",
  collectGoogle: "From your Google account: the account identifier (sub), email, name and photo.",
  collectApp: "From what you log in the app: shelf, rating, review, reading dates, current page, comments, friendships and invites.",
  purposeTitle: "What we use it for",
  purposeBody: "To identify your account, keep your shelf and show your friends what the next section describes.",
  friendsTitle: "What your friends see",
  friendsSee: "Your friends see the books in Reading and Read, with reading year and current page; your public comments; the title and authors of books you added by hand; your name and photo.",
  friendsPrivate: "Your rating, your review, your reading dates and your private comments do not leave your account.",
  friendsEmail: "Your email never goes to your friends.",
  cookiesTitle: "Cookies",
  cookieSid: "sid: keeps you signed in, for 30 days.",
  cookieLang: "lang: remembers the language you chose, for 1 year.",
  cookieState: "oauth_state: protects sign-in with Google, for 10 minutes.",
  servicesTitle: "Other services",
  serviceSearch: "The term you search for goes from our server to Google Books or Open Library, without your user identifier.",
  serviceCovers: "Covers come straight to your device from Google Books or Open Library. These sources see your IP address.",
  serviceCloudflare: "Traffic goes through Cloudflare, which sees your IP address and your country.",
  serviceNone: "We do not use analytics and we do not show ads.",
  deviceTitle: "On your device",
  deviceBody: "Your device holds a friend invite for up to 1 hour, editing drafts and caches of covers and synopses. All of this is cleared when you sign out.",
  securityTitle: "Security",
  securityBody: "The connection uses HTTPS and the session cookie is HttpOnly, out of reach of page scripts.",
  retentionTitle: "How long we keep it",
  retentionBody: "Data is kept for as long as the account exists.",
  backupRetention: "Deleted data may remain in backups for up to 30 days.",
  retentionReport: "An open report keeps a copy of the reported comment, even if its author deletes it. That copy goes away if the author deletes their account.",
  retentionBan: "A banned account is retained to prevent the person from coming back.",
  deletionTitle: "Account deletion",
  deletionDeleted: "Deletion erases the account, shelf, comments, friendships, invites and books you added by hand.",
  deletionKept: "Catalog books (Google Books and Open Library) stay, with no link to you.",
  deletionHow: "How to request it: {deleteLink}.",

  termsTitle: "Terms of use",
  termsDescription: `Who can use ${APP_NAME}, what is forbidden, how to report and how to reach the developer.`,
  termsAgeTitle: "Who can use it",
  termsAgeBody: `${APP_NAME} is for people aged 13 or older.`,
  termsForbiddenTitle: "What is forbidden",
  termsForbiddenIntro: "In comments and in your account name, do not post:",
  termsForbiddenHarassment: "harassment",
  termsForbiddenHate: "hate",
  termsForbiddenThreat: "threats",
  termsForbiddenSexual: "sexual content",
  termsForbiddenIllegal: "illegal content",
  termsForbiddenSpam: "spam",
  termsForbiddenPersonal: "other people's data",
  termsReportTitle: "Reporting and blocking",
  termsReportBody: "In the app, you can report a comment or a friend and block a friend.",
  termsModerationTitle: "Moderation",
  termsModerationBody: "Moderation may remove comments and ban accounts.",
  termsContactTitle: "Contact",
  termsContactBody: "Write to {email}, including to request content removal or to raise catalog rights issues.",

  deleteTitle: "Delete account",
  deleteDescription: `How to delete your ${APP_NAME} account, by ${DEVELOPER_NAME}: what is erased and what stays.`,
  deleteIntro: `How to delete your account on ${APP_NAME}, an app by ${DEVELOPER_NAME}.`,
  deletePathTitle: "On the website, without reinstalling the app",
  deleteStep1: "Sign in on the web at {login}.",
  deleteStep2: "Open Profile.",
  deleteStep3: "Tap Delete account and confirm.",
  deleteEmailTitle: "By email",
  deleteEmailBody: "If you prefer, ask at {email}. You will get a reply within 30 days.",
  deleteGoneTitle: "What is erased",
  deleteKeptTitle: "What stays",
};

const ES: Record<LegalKey, string> = {
  back: "Volver a Estante",
  languageLabel: "Idioma",
  otherPagesLabel: "Páginas legales",
  privacyNav: "Política de privacidad",
  termsNav: "Términos de uso",
  deleteNav: "Eliminar cuenta",
  updated: "Última actualización: 9 de noviembre de 2026",
  contactLine: "Contacto: {email}",

  privacyTitle: "Política de privacidad",
  privacyDescription: `Qué datos guarda ${APP_NAME}, quién ve cada uno y cómo eliminar tu cuenta.`,
  privacyIntro: `Esta política explica qué datos guarda ${APP_NAME}, quién puede verlos y qué pasa cuando eliminas tu cuenta.`,
  whoTitle: "Quién responde por la app",
  whoBody: `${APP_NAME} es desarrollada por ${DEVELOPER_NAME}. Contacto: {email}.`,
  collectTitle: "Qué guardamos",
  collectGoogle: "De tu cuenta de Google: el identificador de la cuenta (sub), el correo electrónico, el nombre y la foto.",
  collectApp: "De lo que registras en la app: estantería, valoración, reseña, fechas de lectura, página actual, comentarios, amistades e invitaciones.",
  purposeTitle: "Para qué lo usamos",
  purposeBody: "Para identificar tu cuenta, guardar tu estantería y mostrar a tus amigos lo que describe la siguiente sección.",
  friendsTitle: "Qué ven tus amigos",
  friendsSee: "Tus amigos ven los libros en Leyendo y Leídos, con año de lectura y página actual; tus comentarios públicos; el título y los autores de los libros registrados a mano; tu nombre y tu foto.",
  friendsPrivate: "Tu valoración, tu reseña, tus fechas de lectura y tus comentarios privados no salen de tu cuenta.",
  friendsEmail: "Tu correo electrónico nunca llega a tus amigos.",
  cookiesTitle: "Cookies",
  cookieSid: "sid: mantiene tu sesión abierta, durante 30 días.",
  cookieLang: "lang: recuerda el idioma elegido, durante 1 año.",
  cookieState: "oauth_state: protege el inicio de sesión con Google, durante 10 minutos.",
  servicesTitle: "Otros servicios",
  serviceSearch: "El término que buscas va de nuestro servidor a Google Books o a Open Library, sin tu identificador de usuario.",
  serviceCovers: "Las portadas llegan directamente a tu dispositivo desde Google Books o Open Library. Esas fuentes ven tu dirección IP.",
  serviceCloudflare: "El tráfico pasa por Cloudflare, que ve tu dirección IP y tu país.",
  serviceNone: "No usamos analytics y no mostramos anuncios.",
  deviceTitle: "En tu dispositivo",
  deviceBody: "En tu dispositivo quedan una invitación de amistad por hasta 1 hora, borradores de edición y cachés de portadas y sinopsis. Todo eso se borra cuando cierras la sesión.",
  securityTitle: "Seguridad",
  securityBody: "La conexión usa HTTPS y la cookie de sesión es HttpOnly, fuera del alcance de los scripts de la página.",
  retentionTitle: "Cuánto tiempo lo guardamos",
  retentionBody: "Los datos se guardan mientras exista la cuenta.",
  backupRetention: "Los datos borrados pueden seguir en copias de seguridad (backups) hasta 30 días.",
  retentionReport: "Una denuncia abierta guarda una copia del comentario denunciado, aunque su autor lo borre. Esa copia desaparece si el autor elimina su cuenta.",
  retentionBan: "Una cuenta bloqueada por moderación queda retenida para impedir que la persona vuelva.",
  deletionTitle: "Eliminación de la cuenta",
  deletionDeleted: "La eliminación borra la cuenta, la estantería, los comentarios, las amistades, las invitaciones y los libros registrados a mano.",
  deletionKept: "Los libros del catálogo (Google Books y Open Library) quedan, sin vínculo contigo.",
  deletionHow: "Cómo pedirla: {deleteLink}.",

  termsTitle: "Términos de uso",
  termsDescription: `Quién puede usar ${APP_NAME}, qué está prohibido, cómo denunciar y cómo hablar con el desarrollador.`,
  termsAgeTitle: "Quién puede usarla",
  termsAgeBody: `${APP_NAME} es para personas de 13 años o más.`,
  termsForbiddenTitle: "Qué está prohibido",
  termsForbiddenIntro: "En los comentarios y en el nombre de la cuenta, no publiques:",
  termsForbiddenHarassment: "acoso",
  termsForbiddenHate: "odio",
  termsForbiddenThreat: "amenazas",
  termsForbiddenSexual: "contenido sexual",
  termsForbiddenIllegal: "contenido ilegal",
  termsForbiddenSpam: "spam",
  termsForbiddenPersonal: "datos de terceros",
  termsReportTitle: "Denuncia y bloqueo",
  termsReportBody: "En la app, puedes denunciar un comentario o a un amigo y bloquear a un amigo.",
  termsModerationTitle: "Moderación",
  termsModerationBody: "La moderación puede quitar comentarios y expulsar cuentas.",
  termsContactTitle: "Contacto",
  termsContactBody: "Escribe a {email}, también para pedir la retirada de contenido o tratar derechos sobre el catálogo.",

  deleteTitle: "Eliminar cuenta",
  deleteDescription: `Cómo eliminar tu cuenta de ${APP_NAME}, de ${DEVELOPER_NAME}: qué se borra y qué queda.`,
  deleteIntro: `Cómo eliminar tu cuenta de ${APP_NAME}, app de ${DEVELOPER_NAME}.`,
  deletePathTitle: "En el sitio web, sin reinstalar la app",
  deleteStep1: "Entra por la web en {login}.",
  deleteStep2: "Abre Perfil.",
  deleteStep3: "Toca Eliminar cuenta y confirma.",
  deleteEmailTitle: "Por correo electrónico",
  deleteEmailBody: "Si lo prefieres, pídelo en {email}. La respuesta llega en hasta 30 días.",
  deleteGoneTitle: "Qué se borra",
  deleteKeptTitle: "Qué queda",
};

export const LEGAL_TEXT: Record<Locale, Record<LegalKey, string>> = { pt: PT, en: EN, es: ES };

const PAGE_HEAD: Record<LegalPage, { title: LegalKey; description: LegalKey }> = {
  privacy: { title: "privacyTitle", description: "privacyDescription" },
  terms: { title: "termsTitle", description: "termsDescription" },
  deleteAccount: { title: "deleteTitle", description: "deleteDescription" },
};

const CANONICAL_QUERY: Record<Locale, string> = { pt: "?lang=pt", en: "", es: "?lang=es" };

/** Mesmas cores e medidas de `client/landing.html`. */
const STYLE = `:root {
  --bg: #fafaf9; --fg: #1c1917; --muted: #57534e; --card: #fff; --line: #e7e5e4; --accent-soft: #fef3c7;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0c0a09; --fg: #f5f5f4; --muted: #a8a29e; --card: #1c1917; --line: #292524; --accent-soft: #451a03; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
a { color: inherit; }
.wrap { max-width: 40rem; margin: 0 auto; padding: 0 1.25rem; }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; }
.back { display: inline-flex; align-items: center; min-height: 2.75rem; font-weight: 600; }
.langs { display: flex; margin-left: auto; font-size: .85rem; font-weight: 600; }
.langs a { display: inline-flex; align-items: center; justify-content: center; min-width: 2.25rem; min-height: 2.75rem; border-radius: .6rem; color: var(--muted); text-decoration: none; }
.langs a.on { color: var(--fg); text-decoration: underline; text-underline-offset: .25em; }
h1 { font-size: clamp(1.75rem, 6vw, 2.25rem); line-height: 1.15; letter-spacing: -.02em; margin: 1rem 0 .5rem; font-weight: 900; }
h2 { font-size: 1.2rem; letter-spacing: -.01em; margin: 0 0 .5rem; }
section { padding: 1rem 0; }
p, ul, ol { margin: 0 0 .6rem; }
ul, ol { padding-left: 1.25rem; }
li { margin: .25rem 0; }
.muted { color: var(--muted); font-size: .9rem; }
.callout { background: var(--accent-soft); border: 1px solid var(--line); border-radius: 1rem; padding: 1rem 1.1rem; margin: 1rem 0; }
footer { padding: 1.5rem 0 3rem; border-top: 1px solid var(--line); color: var(--muted); font-size: .9rem; }
footer a { display: inline-flex; align-items: center; min-height: 2.75rem; color: var(--muted); }
footer nav { display: flex; flex-wrap: wrap; column-gap: 1rem; }`;

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Texto escapado com os links no lugar dos marcadores. */
function inline(text: Record<LegalKey, string>, key: LegalKey) {
  return escapeHtml(text[key])
    .replaceAll("{email}", `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`)
    .replaceAll("{login}", `<a href="/login">/login</a>`)
    .replaceAll("{deleteLink}", `<a href="${LEGAL_PATHS.deleteAccount}">${escapeHtml(text.deleteNav)}</a>`);
}

function pageBody(page: LegalPage, text: Record<LegalKey, string>) {
  const p = (key: LegalKey) => `<p>${inline(text, key)}</p>`;
  const items = (keys: LegalKey[]) => keys.map((key) => `<li>${inline(text, key)}</li>`).join("");
  const ul = (...keys: LegalKey[]) => `<ul>${items(keys)}</ul>`;
  const ol = (...keys: LegalKey[]) => `<ol>${items(keys)}</ol>`;
  const section = (title: LegalKey, ...blocks: string[]) => `<section><h2>${inline(text, title)}</h2>${blocks.join("")}</section>`;

  switch (page) {
    case "privacy":
      return [
        p("privacyIntro"),
        section("whoTitle", p("whoBody")),
        section("collectTitle", ul("collectGoogle", "collectApp")),
        section("purposeTitle", p("purposeBody")),
        section("friendsTitle", ul("friendsSee", "friendsPrivate", "friendsEmail")),
        section("cookiesTitle", ul("cookieSid", "cookieLang", "cookieState")),
        section("servicesTitle", ul("serviceSearch", "serviceCovers", "serviceCloudflare", "serviceNone")),
        section("deviceTitle", p("deviceBody")),
        section("securityTitle", p("securityBody")),
        section("retentionTitle", ul("retentionBody", "backupRetention", "retentionReport", "retentionBan")),
        `<section id="exclusao"><h2>${inline(text, "deletionTitle")}</h2>${ul("deletionDeleted", "deletionKept")}${p("deletionHow")}</section>`,
      ].join("\n");
    case "terms":
      return [
        section("termsAgeTitle", p("termsAgeBody")),
        section(
          "termsForbiddenTitle",
          p("termsForbiddenIntro"),
          ul("termsForbiddenHarassment", "termsForbiddenHate", "termsForbiddenThreat", "termsForbiddenSexual", "termsForbiddenIllegal", "termsForbiddenSpam", "termsForbiddenPersonal"),
        ),
        section("termsReportTitle", p("termsReportBody")),
        section("termsModerationTitle", p("termsModerationBody")),
        section("termsContactTitle", p("termsContactBody")),
      ].join("\n");
    case "deleteAccount":
      return [
        p("deleteIntro"),
        `<section class="callout"><h2>${inline(text, "deletePathTitle")}</h2>${ol("deleteStep1", "deleteStep2", "deleteStep3")}</section>`,
        section("deleteEmailTitle", p("deleteEmailBody")),
        section("deleteGoneTitle", p("deletionDeleted")),
        section("deleteKeptTitle", ul("deletionKept", "backupRetention", "retentionReport", "retentionBan")),
      ].join("\n");
  }
}

/** HTML completo, sem JS. `baseUrl` só entra no canonical e no `hreflang`: os links internos são relativos. */
export function renderLegal(page: LegalPage, locale: Locale, baseUrl: string): string {
  const text = LEGAL_TEXT[locale];
  const path = LEGAL_PATHS[page];
  const { title, description } = PAGE_HEAD[page];
  const alternates = LOCALES.map((option) => `<link rel="alternate" hreflang="${option}" href="${baseUrl}${path}${CANONICAL_QUERY[option]}" />`).join("\n    ");
  const langs = LOCALES.map((option) => {
    const current = option === locale;
    return `<a class="${current ? "on" : "off"}" href="${path}?lang=${option}" aria-current="${current}">${option.toUpperCase()}</a>`;
  }).join("\n          ");

  return `<!doctype html>
<html lang="${HTML_LANG[locale]}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f59e0b" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1c1917" media="(prefers-color-scheme: dark)" />
    <title>${escapeHtml(text[title])} · ${APP_NAME}</title>
    <meta name="description" content="${escapeHtml(text[description])}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${baseUrl}${path}${CANONICAL_QUERY[locale]}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <a class="back" href="/">← ${escapeHtml(text.back)}</a>
        <nav class="langs" aria-label="${escapeHtml(text.languageLabel)}">
          ${langs}
        </nav>
      </header>
      <main>
        <h1>${escapeHtml(text[title])}</h1>
        <p class="muted">${escapeHtml(text.updated)}</p>
${pageBody(page, text)}
      </main>
      <footer>
        <nav aria-label="${escapeHtml(text.otherPagesLabel)}">
          <a href="${LEGAL_PATHS.privacy}">${escapeHtml(text.privacyNav)}</a>
          <a href="${LEGAL_PATHS.terms}">${escapeHtml(text.termsNav)}</a>
          <a href="${LEGAL_PATHS.deleteAccount}">${escapeHtml(text.deleteNav)}</a>
        </nav>
        <p>${inline(text, "contactLine")}</p>
      </footer>
    </div>
  </body>
</html>
`;
}
