(() => {
  if (window.top !== window.self || window.__COMBINED_BOT_LOADED__) return;
  window.__COMBINED_BOT_LOADED__ = true;

  console.log("🤖 ربات ترکیبی لینا - منابع + ساختمان");

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = (m) => console.log("[LinaBot]", m);

  const KEY_STATE = "combined_cycle_state";
  const KEY_ACTIVE = "combined_cycle_active";

  function getState() { 
    try { 
      return JSON.parse(localStorage.getItem(KEY_STATE)) || {}; 
    } catch { 
      return {}; 
    } 
  }

  function setState(s) { 
    localStorage.setItem(KEY_STATE, JSON.stringify(s)); 
  }

  // 🔗 همگام‌سازی لیست دهکده‌ها با storage افزونه
  async function sendVillagesToExtension(list) {
    try {
      await chrome.storage?.local?.set?.({ villages: list });
      console.log("[LinaBot] 📡 دهکده‌ها در افزونه ذخیره شدند.", list?.length || 0);
    } catch (e) {
      console.warn("[LinaBot] ❌ خطا در ذخیره دهکده‌ها داخل افزونه:", e);
    }
  }

  // 📦 دریافت/به‌روزرسانی لیست دهکده‌ها از DOM
  function refreshVillages() {
    const nodes = document.querySelectorAll(".listEntry.village");
    if (!nodes.length) { 
      log("⚠️ دهکده‌ای پیدا نشد."); 
      setState({ villages: [], index: 0, currentPage: "dorf1" }); 
      sendVillagesToExtension([]); 
      return []; 
    }
    
    const list = [];
    nodes.forEach(n => {
      list.push({
        id: n.getAttribute("data-did"),
        name: n.querySelector(".name")?.innerText.trim() || "Unknown",
        active: n.classList.contains("active")
      });
    });
    
    setState({ villages: list, index: 0, currentPage: "dorf1" });
    console.table(list.map(v => ({ ...v, current: v.active ? "✅" : "" })));
    sendVillagesToExtension(list);
    log(`✅ ${list.length} دهکده به‌روزرسانی شد.`);
    return list;
  }

  // استخراج slot از کلاس‌ها
  function extractSlotId(el) {
    const href = el.getAttribute('href');
    const idMatch = href?.match(/id=(\d+)/);
    return idMatch ? idMatch[1] : null;
  }

  // استخراج لول از المان
  function extractLevel(el) {
    // روش 1: از data-level استخراج کن
    const dataLevel = el.getAttribute('data-level');
    if (dataLevel && !isNaN(dataLevel)) {
      return parseInt(dataLevel);
    }
    
    // روش 2: از المنت labelLayer داخل المان
    const labelLayer = el.querySelector(".labelLayer");
    if (labelLayer && labelLayer.textContent) {
      const level = parseInt(labelLayer.textContent.trim());
      if (!isNaN(level)) return level;
    }
    
    return 0;
  }

  // تحلیل منابع در dorf1.php
  function analyzeResources() {
    const resources = document.querySelectorAll("a.good.level");
    
    if (resources.length === 0) { 
      log("❌ هیچ منبع قابل ارتقایی در dorf1 پیدا نشد.");
      return []; 
    }
    
    const list = [];
    
    resources.forEach(function(resource, index) {
      const level = extractLevel(resource);
      const id = extractSlotId(resource);
      
      if (id && !isNaN(level)) {
        list.push({
          element: resource,
          id: id,
          level: level,
          slotNumber: parseInt(id)
        });
        
        log(`⛏️ منبع ${index + 1}: ID ${id}, لول ${level}`);
      }
    });
    
    log(`✅ ${list.length} منبع قابل ارتقا در dorf1 پیدا شد.`);
    return list;
  }

  // تحلیل ساختمان‌ها در dorf2.php - فقط Good
  function analyzeBuildings() {
    log("🔍 در حال جستجوی ساختمان‌های قابل ارتقا (Good) در dorf2...");
    
    // فقط ساختمان‌هایی که کلاس Good دارند
    const buildings = document.querySelectorAll('a.level.colorLayer.good');
    
    if (buildings.length === 0) { 
      log("❌ هیچ ساختمان قابل ارتقایی (Good) در dorf2 پیدا نشد.");
      return []; 
    }
    
    const list = [];
    
    buildings.forEach(function(building, index) {
      const level = extractLevel(building);
      const id = extractSlotId(building);
      
      if (id && !isNaN(level)) {
        list.push({
          element: building,
          id: id,
          level: level,
          slotNumber: parseInt(id),
          classes: building.className
        });
        
        log(`🏗️ ساختمان Good ${index + 1}: ID ${id}, لول ${level}`);
      }
    });
    
    log(`✅ ${list.length} ساختمان قابل ارتقا (Good) در dorf2 پیدا شد.`);
    return list;
  }

  // پیدا کردن و ارتقای آیتم با کمترین لول
  async function findAndUpgradeOneItem(analyzeFunction, pageType) {
    const itemList = analyzeFunction();
    
    if (itemList.length === 0) {
      return false;
    }

    log(`🔍 بررسی ${itemList.length} آیتم قابل ارتقا در ${pageType}...`);

    // پیدا کردن کمترین لول
    const minLevel = Math.min.apply(Math, itemList.map(function(item) { return item.level; }));
    
    // فیلتر کردن آیتم‌ها با کمترین لول
    const lowestLevelItems = itemList.filter(function(item) { return item.level === minLevel; });
    
    log(`📊 ${lowestLevelItems.length} آیتم با لول ${minLevel} پیدا شد`);

    // اگر چند آیتم با کمترین لول داریم، اولویت‌بندی کنیم
    let targetItem;
    
    if (lowestLevelItems.length === 1) {
      targetItem = lowestLevelItems[0];
    } else {
      targetItem = lowestLevelItems.sort(function(a, b) { return a.slotNumber - b.slotNumber; })[0];
      log(`🔀 چند آیتم با لول ${minLevel}: انتخاب slot ${targetItem.id} (اولویت slot پایین)`);
    }

    log(`🎯 ارتقای ${pageType} - ID ${targetItem.id} (لول ${targetItem.level})`);
    const buildUrl = "build.php?id=" + targetItem.id;
    log(`🔗 رفتن به: ${buildUrl}`);
    window.location.href = buildUrl;
    
    return true;
  }

  // صفحه build.php: کلیک روی دکمه Upgrade
  async function handleBuildPage() {
    log("🛠️ build.php — جستجوی دکمه Upgrade...");
    
    for (let i = 0; i < 90; i++) {
      const btn = document.querySelector("button.build, button.green.build, button.textButtonV1.green.build");
      
      if (btn && !btn.disabled) {
        const text = (btn.innerText || btn.textContent || "").trim();
        log(`🎯 کلیک روی دکمه: "${text}"`);
        
        // اگر jQuery موجود باشد، از jQuery برای کلیک استفاده کن
        if (typeof jQuery !== 'undefined') {
          jQuery(btn).click();
        } else {
          btn.click();
        }
        
        // منتظر بمان تا عملیات ارتقا کامل شود
        log("⏳ منتظر تکمیل عملیات ارتقا...");
        await sleep(5000);
        
        return;
      }
      await sleep(300);
    }
    
    log("⚠️ دکمه Upgrade پیدا نشد");
  }

  // رفتن به دهکده بعدی
  function goNextVillage() {
    const s = getState();
    if (!s.villages || !s.villages.length) { 
      log("⚠️ لیست دهکده‌ها خالیه."); 
      return; 
    }
    s.index = (s.index + 1) % s.villages.length;
    s.currentPage = "dorf1"; // بازگشت به dorf1 برای دهکده جدید
    setState(s);
    const next = s.villages[s.index];
    log("➡️ دهکده بعدی: " + next.name + " (#" + next.id + ")");
    window.location.href = "dorf1.php?newdid=" + next.id;
  }

  // شروع چرخه ترکیبی
  async function startCycle() {
    localStorage.setItem(KEY_ACTIVE, "1");
    let s = getState();
    
    // اگر لیست دهکده‌ها خالی است، بروزرسانی کن
    if (!s.villages || !s.villages.length) {
      log("🔄 در حال دریافت لیست دهکده‌ها...");
      s.villages = refreshVillages();
      setState(s);
    }

    const currentDid = new URLSearchParams(location.search).get("newdid") || s.villages[s.index]?.id;
    const current = s.villages.find(v => v.id === currentDid);
    log(`🏠 دهکده فعلی: ${current?.name || "?"} | صفحه: ${s.currentPage || "dorf1"}`);

    // اگر در صفحه build.php هستیم
    if (location.pathname.includes("build.php")) {
      await handleBuildPage();
      
      // بعد از build.php، بر اساس صفحه قبلی تصمیم بگیر
      if (s.currentPage === "dorf1") {
        window.location.href = "dorf2.php";
      } else {
        // اگر از dorf2 بودیم، به دهکده بعدی برو
        log("✅ این دهکده کامل بررسی شد → رفتن به دهکده بعدی");
        await sleep(5000);
        goNextVillage();
      }
      return;
    }

    // اگر در صفحه dorf1.php هستیم
    if (location.pathname.includes("dorf1.php")) {
      s.currentPage = "dorf1";
      setState(s);
      
      const upgraded = await findAndUpgradeOneItem(analyzeResources, "منبع");
      
      if (!upgraded) {
        // اگر منبعی نبود، برو dorf2
        log("⏭️ هیچ منبعی برای ارتقا نبود → رفتن به dorf2");
        await sleep(2000);
        window.location.href = "dorf2.php";
      }
    }
    // اگر در صفحه dorf2.php هستیم
    else if (location.pathname.includes("dorf2.php")) {
      s.currentPage = "dorf2";
      setState(s);
      
      const upgraded = await findAndUpgradeOneItem(analyzeBuildings, "ساختمان");
      
      if (!upgraded) {
        // اگر ساختمان Good نبود، برو دهکده بعدی
        log("✅ هیچ ساختمان قابل ارتقایی (Good) نبود → رفتن به دهکده بعدی");
        await sleep(5000);
        goNextVillage();
      }
    }
    // اگر در صفحه دیگری هستیم، به dorf1 برویم
    else {
      window.location.href = "dorf1.php";
    }
  }

  function stopCycle() {
    localStorage.removeItem(KEY_ACTIVE);
    log("🛑 stopCycle()");
  }

  // ادامه خودکار پس از reload
  if (localStorage.getItem(KEY_ACTIVE) === "1") {
    setTimeout(function() { 
      log("🔄 ادامه خودکار چرخه پس از reload..."); 
      startCycle(); 
    }, 1800);
  }

  // تعریف توابع در window برای دسترسی از popup
  window.CombinedBot = { 
    refreshVillages: refreshVillages,
    startCycle: startCycle, 
    stopCycle: stopCycle 
  };
  
  console.log("✅ ربات ترکیبی لینا آماده است");
})();
