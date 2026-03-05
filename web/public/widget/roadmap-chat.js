(function () {
  "use strict";

  var API_URL =
    "https://45.132.245.30.sslip.io/commons/api/roadmap/chat";

  var STARTERS = [
    "What's in progress?",
    "Show P0 items",
    "Roadmap stats",
  ];

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------

  var style = document.createElement("style");
  style.textContent = [
    ".bkc-chat-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#06b6d4;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(6,182,212,.4);display:flex;align-items:center;justify-content:center;z-index:10000;transition:transform .2s,box-shadow .2s}",
    ".bkc-chat-bubble:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(6,182,212,.55)}",
    ".bkc-chat-bubble svg{width:28px;height:28px;fill:currentColor}",
    ".bkc-chat-panel{position:fixed;bottom:92px;right:24px;width:380px;max-width:calc(100vw - 48px);height:500px;max-height:calc(100vh - 120px);background:#0f172a;border:1px solid #1e293b;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;flex-direction:column;z-index:10000;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    ".bkc-chat-panel[hidden]{display:none}",
    ".bkc-chat-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #1e293b;background:#0f172a}",
    ".bkc-chat-header-title{color:#e2e8f0;font-size:14px;font-weight:600}",
    ".bkc-chat-header-sub{color:#64748b;font-size:11px}",
    ".bkc-chat-close{background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;padding:4px 8px;border-radius:6px}",
    ".bkc-chat-close:hover{color:#e2e8f0;background:#1e293b}",
    ".bkc-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}",
    ".bkc-chat-messages::-webkit-scrollbar{width:6px}",
    ".bkc-chat-messages::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}",
    ".bkc-chat-msg{max-width:88%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}",
    ".bkc-chat-msg a{color:#38bdf8;text-decoration:underline}",
    ".bkc-chat-msg-user{align-self:flex-end;background:#164e63;color:#e2e8f0;border-bottom-right-radius:4px}",
    ".bkc-chat-msg-bot{align-self:flex-start;background:#1e293b;color:#cbd5e1;border-bottom-left-radius:4px}",
    ".bkc-chat-msg-error{align-self:flex-start;background:#2d1b1b;color:#fca5a5;border-bottom-left-radius:4px}",
    ".bkc-chat-starters{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 12px}",
    ".bkc-chat-starter{background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;transition:background .15s,color .15s}",
    ".bkc-chat-starter:hover{background:#334155;color:#e2e8f0}",
    ".bkc-chat-input-row{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid #1e293b;background:#0f172a}",
    ".bkc-chat-input{flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;resize:none}",
    ".bkc-chat-input::placeholder{color:#475569}",
    ".bkc-chat-input:focus{border-color:#06b6d4}",
    ".bkc-chat-send{background:#06b6d4;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;white-space:nowrap}",
    ".bkc-chat-send:hover{background:#0891b2}",
    ".bkc-chat-send:disabled{opacity:.5;cursor:not-allowed}",
    ".bkc-chat-loading span{display:inline-block;width:6px;height:6px;background:#64748b;border-radius:50%;margin:0 2px;animation:bkc-dot .6s infinite alternate}",
    ".bkc-chat-loading span:nth-child(2){animation-delay:.2s}",
    ".bkc-chat-loading span:nth-child(3){animation-delay:.4s}",
    "@keyframes bkc-dot{to{opacity:.2;transform:translateY(-4px)}}",
  ].join("\n");
  document.head.appendChild(style);

  // -----------------------------------------------------------------------
  // DOM
  // -----------------------------------------------------------------------

  // Bubble
  var bubble = document.createElement("button");
  bubble.className = "bkc-chat-bubble";
  bubble.setAttribute("aria-label", "Open roadmap chat");
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
  document.body.appendChild(bubble);

  // Panel
  var panel = document.createElement("div");
  panel.className = "bkc-chat-panel";
  panel.hidden = true;
  panel.innerHTML = [
    '<div class="bkc-chat-header">',
    '  <div><div class="bkc-chat-header-title">BKC Roadmap</div><div class="bkc-chat-header-sub">Ask about the roadmap</div></div>',
    '  <button class="bkc-chat-close" aria-label="Close">&times;</button>',
    "</div>",
    '<div class="bkc-chat-messages" id="bkc-msgs"></div>',
    '<div class="bkc-chat-starters" id="bkc-starters"></div>',
    '<div class="bkc-chat-input-row">',
    '  <input class="bkc-chat-input" id="bkc-input" type="text" placeholder="Ask about the roadmap..." autocomplete="off">',
    '  <button class="bkc-chat-send" id="bkc-send">Send</button>',
    "</div>",
  ].join("\n");
  document.body.appendChild(panel);

  var msgs = document.getElementById("bkc-msgs");
  var input = document.getElementById("bkc-input");
  var sendBtn = document.getElementById("bkc-send");
  var startersDiv = document.getElementById("bkc-starters");
  var closeBtn = panel.querySelector(".bkc-chat-close");

  // Render starters
  STARTERS.forEach(function (text) {
    var btn = document.createElement("button");
    btn.className = "bkc-chat-starter";
    btn.textContent = text;
    btn.addEventListener("click", function () {
      input.value = text;
      send();
    });
    startersDiv.appendChild(btn);
  });

  // -----------------------------------------------------------------------
  // Logic
  // -----------------------------------------------------------------------

  var sending = false;

  function addMessage(text, role, sources) {
    var div = document.createElement("div");
    div.className = "bkc-chat-msg bkc-chat-msg-" + role;
    // Convert markdown-style bold and bullet points for bot messages
    if (role === "bot") {
      var html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^- /gm, "\u2022 ");
      div.innerHTML = html;

      // Append clickable source links
      if (sources && sources.length > 0) {
        var srcDiv = document.createElement("div");
        srcDiv.style.cssText = "margin-top:10px;padding-top:8px;border-top:1px solid #334155;font-size:12px;";
        var label = document.createElement("div");
        label.style.cssText = "color:#64748b;margin-bottom:4px;font-weight:600;";
        label.textContent = "Related nodes:";
        srcDiv.appendChild(label);
        sources.forEach(function (src) {
          var nodeId = (src.uri || "").replace(/^roadmap:/, "");
          if (!nodeId) return;
          var link = document.createElement("a");
          link.href = "#";
          link.style.cssText = "display:block;color:#38bdf8;text-decoration:none;padding:2px 0;";
          link.textContent = "\u2022 " + (src.title || nodeId);
          link.addEventListener("click", function (e) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("bkc-select-node", { detail: nodeId }));
          });
          link.addEventListener("mouseenter", function () { link.style.textDecoration = "underline"; });
          link.addEventListener("mouseleave", function () { link.style.textDecoration = "none"; });
          srcDiv.appendChild(link);
        });
        div.appendChild(srcDiv);
      }
    } else {
      div.textContent = text;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showLoading() {
    var div = document.createElement("div");
    div.className = "bkc-chat-msg bkc-chat-msg-bot bkc-chat-loading";
    div.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function send() {
    var query = input.value.trim();
    if (!query || sending) return;

    addMessage(query, "user");
    input.value = "";
    startersDiv.hidden = true;

    sending = true;
    sendBtn.disabled = true;
    var loader = showLoading();

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        loader.remove();
        if (!result.ok) {
          var errMsg =
            result.status === 429
              ? "Too many requests. Please wait a moment."
              : result.data.error || "Something went wrong.";
          addMessage(errMsg, "error");
        } else {
          addMessage(result.data.answer || "No answer received.", "bot", result.data.sources);
        }
      })
      .catch(function () {
        loader.remove();
        addMessage("Network error. Please check your connection.", "error");
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  bubble.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) input.focus();
  });

  closeBtn.addEventListener("click", function () {
    panel.hidden = true;
  });

  sendBtn.addEventListener("click", send);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
    }
  });
})();
