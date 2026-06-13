document.addEventListener("DOMContentLoaded", async ()=>{
  const serverInput = document.getElementById("serverUrl");
  const statusBox = document.getElementById("statusBox");
  const logs = document.getElementById("logs");
  const list = document.getElementById("villagesList");

  // بارگذاری اولیه
  const {serverUrl, villages} = await chrome.storage.local.get(["serverUrl", "villages"]);
  if (serverUrl) serverInput.value = serverUrl;
  renderVillages(villages || []);

  const logLine = (t) => {
    const d = new Date().toLocaleTimeString("fa-IR");
    logs.insertAdjacentHTML("afterbegin", `<div>[${d}] ${t}</div>`);
  };

  // تابع ساده رندر
  function renderVillages(vs) {
    list.innerHTML = "";
    if (!vs || !vs.length) {
      list.innerHTML = "<div style='text-align:center;color:#777;padding:8px'>⚠️ هنوز دهکده‌ای ذخیره نشده</div>";
      return;
    }
    
    vs.forEach(v => {
      const card = document.createElement("div");
      card.className = "villageCard";
      card.dataset.id = v.id;
      card.dataset.name = v.name;
      
      card.innerHTML = `
        <button class="delete-btn" title="حذف از لیست">×</button>
        <b>${v.name}</b>
        <span class="id">ID: ${v.id} ${v.active ? '📍 فعلی' : ''}</span>
      `;
      
      list.appendChild(card);
      
      // رویداد حذف
      card.querySelector(".delete-btn").addEventListener("click", async function(e) {
        e.stopPropagation();
        
        const id = card.dataset.id;
        const name = card.dataset.name;
        
        if (confirm(`حذف کامل دهکده "${name}"؟`)) {
          // 1. از لیست نمایش حذف کن
          card.remove();
          
          // 2. در localStorage ذخیره کن
          try {
            // به تب تراوین بگو این دهکده را حذف کند
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (!tabs.length) return;
              
              chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: (villageId, villageName) => {
                  // از لیست حذف شده‌ها
                  const key = "lina_removed_villages_simple";
                  let removed = JSON.parse(localStorage.getItem(key) || "[]");
                  if (!removed.includes(villageId)) {
                    removed.push(villageId);
                    localStorage.setItem(key, JSON.stringify(removed));
                    console.log(`🗑️ دهکده ${villageId} (${villageName}) حذف شد`);
                  }
                  
                  // همچنین state را به‌روز کن
                  const stateStr = localStorage.getItem("combined_cycle_state");
                  if (stateStr) {
                    try {
                      const state = JSON.parse(stateStr);
                      if (state.villages && Array.isArray(state.villages)) {
                        const before = state.villages.length;
                        state.villages = state.villages.filter(v => v.id !== villageId);
                        localStorage.setItem("combined_cycle_state", JSON.stringify(state));
                        console.log(`🧹 State: ${before} -> ${state.villages.length} دهکده`);
                      }
                    } catch (e) {
                      console.error("خطا در state:", e);
                    }
                  }
                },
                args: [id, name]
              });
            });
            
            // 3. از chrome.storage هم حذف کن
            const {villages: currentVillages} = await chrome.storage.local.get(["villages"]);
            if (currentVillages) {
              const filtered = currentVillages.filter(v => v.id !== id);
              await chrome.storage.local.set({villages: filtered});
            }
            
            logLine(`🗑️ "${name}" حذف شد`);
            statusBox.textContent = `✅ "${name}" حذف شد`;
            
          } catch (e) {
            console.error("خطا در حذف:", e);
          }
        }
      });
      
      // کلیک برای رفتن به دهکده
      card.addEventListener("click", async function(e) {
        if (e.target.classList.contains("delete-btn")) return;
        const id = this.dataset.id;
        const {serverUrl} = await chrome.storage.local.get("serverUrl");
        if (!serverUrl) return alert("آدرس سرور تنظیم نشده.");
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          if (!tabs.length) return;
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: (id, url) => { 
              window.location.href = `${url.replace(/\/dorf[12]\.php.*$/, "/dorf1.php")}?newdid=${id}`; 
            },
            args: [id, serverUrl]
          });
        });
      });
    });
  }

  // اجرای دستور در ربات
  function executeBotCommand(actionName) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs.length) return;
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: (action) => {
          console.log(`🔧 اجرای دستور: ${action}`);
          if (window.CombinedBot && window.CombinedBot[action]) {
            return window.CombinedBot[action]();
          }
          return null;
        },
        args: [actionName]
      });
    });
  }

  // ذخیره آدرس سرور
  document.getElementById("saveServer").addEventListener("click", () => {
    const val = serverInput.value.trim();
    if (!val) return alert("آدرس سرور را وارد کنید.");
    chrome.storage.local.set({serverUrl: val});
    statusBox.textContent = "✅ آدرس سرور ذخیره شد";
    logLine("Server URL: " + val);
  });

  // بروزرسانی لیست
  document.getElementById("refresh").addEventListener("click", () => {
    executeBotCommand("refreshVillages");
    statusBox.textContent = "♻️ در حال بروزرسانی لیست...";
    logLine("refreshVillages() فراخوانی شد.");
    
    setTimeout(async () => {
      const {villages} = await chrome.storage.local.get(["villages"]);
      renderVillages(villages || []);
      statusBox.textContent = "✅ دهکده‌ها به‌روزرسانی شدند";
      logLine(`دریافت شد: ${villages?.length || 0} دهکده`);
    }, 700);
  });

  // شروع چرخه
  document.getElementById("start").addEventListener("click", () => {
    executeBotCommand("startCycle");
    statusBox.textContent = "🟢 چرخه فعال شد";
    logLine("startCycle() فراخوانی شد.");
  });
  
  // توقف چرخه
  document.getElementById("stop").addEventListener("click", () => {
    executeBotCommand("stopCycle");
    statusBox.textContent = "⛔ چرخه متوقف شد";
    logLine("stopCycle() فراخوانی شد.");
  });
  
  // دکمه بازگردانی همه
  const restoreBtn = document.createElement("button");
  restoreBtn.textContent = "🔃 بازگردانی همه دهکده‌های حذف شده";
  restoreBtn.className = "btn";
  restoreBtn.style.background = "#555";
  restoreBtn.style.marginTop = "10px";
  restoreBtn.style.width = "100%";
  
  restoreBtn.addEventListener("click", async () => {
    if (confirm("بازگردانی همه دهکده‌های حذف شده؟")) {
      // از localStorage پاک کن
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs.length) return;
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: () => {
            localStorage.removeItem("lina_removed_villages_simple");
            console.log("✅ همه دهکده‌های حذف شده بازگردانی شدند");
          }
        });
      });
      
      statusBox.textContent = "✅ همه دهکده‌ها بازگردانی شدند";
      logLine("همه دهکده‌ها بازگردانی شدند");
    }
  });
  
  document.querySelector(".grid").after(restoreBtn);
});
