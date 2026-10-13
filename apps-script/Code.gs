// Paste this into script.google.com, fill in the two lines below, run setup() once.
const SITE = "https://YOURSITE.netlify.app";   // your Netlify URL, no trailing slash
const KEY  = "YOURSECRET";                      // same value as SECRET in Netlify
const TAG  = "page";                            // you email you+page@gmail.com
const CHUNK = 4 * 1024 * 1024;

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("check").timeBased().everyMinutes(1).create();
  check();
}

function check() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const me = Session.getEffectiveUser().getEmail().toLowerCase();
    const [user, domain] = me.split("@");
    const alias = `${user}+${TAG}@${domain}`;
    const props = PropertiesService.getScriptProperties();
    const done = JSON.parse(props.getProperty("done") || "[]");

    for (const t of GmailApp.search(`from:me to:${alias} newer_than:7d`)) {
      for (const m of t.getMessages()) {
        const id = m.getId();
        if (done.includes(id)) continue;
        if (!m.getTo().toLowerCase().includes(alias)) continue;
        if (!m.getFrom().toLowerCase().includes(me)) continue;
        publish(m);
        done.push(id);
        props.setProperty("done", JSON.stringify(done.slice(-300)));
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function publish(m) {
  const id = String(m.getDate().getTime());
  const title = m.getSubject().trim();
  const text = m.getPlainBody().trim();
  const files = [];

  m.getAttachments().forEach((a, i) => {
    const bytes = a.getBytes();
    if (!bytes.length) return;
    const parts = Math.ceil(bytes.length / CHUNK);
    const type = a.getContentType().split(";")[0];
    const name = a.getName();
    for (let p = 0; p < parts; p++) {
      send(`kind=part&post=${id}&file=${i}&part=${p}&parts=${parts}` +
           `&type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`,
           bytes.slice(p * CHUNK, (p + 1) * CHUNK), "application/octet-stream");
    }
    files.push({ key: `${id}-${i}`, type, name });
  });

  if (!title && !text && !files.length) return;
  send("kind=post", JSON.stringify({ id, title, text, files }), "application/json");
}

function send(qs, payload, contentType) {
  const r = UrlFetchApp.fetch(`${SITE}/api/upload?key=${encodeURIComponent(KEY)}&${qs}`, {
    method: "post", payload, contentType, muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) throw new Error(r.getResponseCode() + " " + r.getContentText());
}
