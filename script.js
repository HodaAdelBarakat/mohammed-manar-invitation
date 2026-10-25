const eventDate = new Date("2026-11-13T18:00:00+02:00");
const $ = (id) => document.getElementById(id);

function updateCountdown() {
  const diff = Math.max(0, eventDate.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  $("days").textContent = days;
  $("hours").textContent = String(hours).padStart(2, "0");
  $("minutes").textContent = String(minutes).padStart(2, "0");
  $("seconds").textContent = String(seconds).padStart(2, "0");
}
updateCountdown();
setInterval(updateCountdown, 1000);

const audio = $("weddingAudio");
$("musicButton").addEventListener("click", async () => {
  try {
    if (audio.paused) {
      await audio.play();
      $("musicButton").setAttribute("aria-pressed", "true");
      $("musicLabel").textContent = "إيقاف الأغنية";
    } else {
      audio.pause();
      $("musicButton").setAttribute("aria-pressed", "false");
      $("musicLabel").textContent = "اضغطي لتشغيل الأغنية";
    }
  } catch (err) {
    $("musicLabel").textContent = "تعذر التشغيل — جرّبي الضغط مرة أخرى";
  }
});
audio.addEventListener("ended", () => {
  $("musicButton").setAttribute("aria-pressed", "false");
  $("musicLabel").textContent = "اضغطي لتشغيل الأغنية";
});

const config = window.WEDDING_CONFIG || {};
const hasDatabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const list = $("messagesList");
const status = $("formStatus");
const warning = $("setupWarning");
let supabaseClient = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function renderMessages(messages) {
  $("messageCount").textContent = `${messages.length} رسالة`;
  if (!messages.length) {
    list.innerHTML = '<p class="empty-state">لسه مستنيين أول تهنئة ❤️</p>';
    return;
  }
  list.innerHTML = messages.map((message) => `
    <article class="message-card">
      <strong>${escapeHtml(message.name)}</strong>
      <p>${escapeHtml(message.message)}</p>
    </article>`).join("");
}
function localDemoNotice() {
  warning.textContent = "معاينة فقط: قاعدة البيانات لم تُربط بعد. الرسائل المرسلة هنا لن تُحفظ أو تظهر للزوار الآخرين.";
  $("sendMessage").disabled = true;
  $("sendMessage").textContent = "دفتر التهاني لم يُفعّل بعد";
  $("sendMessage").style.opacity = ".65";
}
async function initGuestbook() {
  if (!hasDatabase) {
    localDemoNotice();
    renderMessages([]);
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = async () => {
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    warning.textContent = "";
    await loadMessages();
  };
  script.onerror = () => {
    warning.textContent = "تعذر تحميل خدمة الرسائل. تأكدي من الاتصال بالإنترنت.";
  };
  document.head.appendChild(script);
}
async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("wedding_messages")
    .select("id,name,message,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    warning.textContent = "دفتر التهاني يحتاج إعداد قاعدة البيانات وسياسات الوصول قبل الاستخدام.";
    return;
  }
  renderMessages(data || []);
}
$("messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    status.textContent = "دفتر التهاني غير مفعّل بعد.";
    return;
  }
  const name = $("guestName").value.trim();
  const message = $("guestMessage").value.trim();
  if (!name || !message) return;
  $("sendMessage").disabled = true;
  status.textContent = "جارٍ إرسال التهنئة...";
  const { error } = await supabaseClient.from("wedding_messages").insert({ name, message });
  $("sendMessage").disabled = false;
  if (error) {
    status.textContent = "لم يتم إرسال الرسالة. جرّبي مرة أخرى.";
    return;
  }
  $("guestName").value = "";
  $("guestMessage").value = "";
  status.textContent = "وصلت تهنئتك ❤️";
  await loadMessages();
});
initGuestbook();
