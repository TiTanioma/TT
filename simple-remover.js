// حذف‌کننده ساده و مؤثر دهکده‌ها
(function() {
    console.log("🗑️ SimpleRemover فعال شد");
    
    // کلید ذخیره‌سازی
    const REMOVED_KEY = "lina_removed_villages_simple";
    
    // دریافت لیست حذف شده‌ها
    function getRemovedIds() {
        try {
            const data = localStorage.getItem(REMOVED_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }
    
    // ذخیره لیست حذف شده‌ها
    function saveRemovedIds(ids) {
        try {
            localStorage.setItem(REMOVED_KEY, JSON.stringify(ids));
            return true;
        } catch {
            return false;
        }
    }
    
    // وقتی CombinedBot لود شد
    if (window.CombinedBot) {
        console.log("✅ SimpleRemover: CombinedBot پیدا شد");
        
        // تابع اصلی را ذخیره کن
        const originalRefresh = window.CombinedBot.refreshVillages;
        
        // تابع جدید که حذف شده‌ها را فیلتر می‌کند
        window.CombinedBot.refreshVillages = function() {
            console.log("[SimpleRemover] در حال دریافت لیست...");
            
            // لیست حذف شده‌ها را بگیر
            const removedIds = getRemovedIds();
            console.log(`[SimpleRemover] ${removedIds.length} دهکده حذف شده`);
            
            // تابع اصلی را اجرا کن
            const allVillages = originalRefresh();
            
            if (!Array.isArray(allVillages)) return allVillages;
            
            // حذف شده‌ها را فیلتر کن
            const filtered = allVillages.filter(v => !removedIds.includes(v.id));
            console.log(`[SimpleRemover] ${allVillages.length} -> ${filtered.length} دهکده`);
            
            // state را با لیست فیلتر شده به‌روز کن
            try {
                const stateStr = localStorage.getItem("combined_cycle_state");
                if (stateStr) {
                    const state = JSON.parse(stateStr);
                    state.villages = filtered;
                    localStorage.setItem("combined_cycle_state", JSON.stringify(state));
                }
            } catch (e) {
                console.warn("[SimpleRemover] خطا در state:", e);
            }
            
            return filtered;
        };
    }
    
    // همچنین برای popup یک API ساده ایجاد می‌کنیم
    window.SimpleVillageRemover = {
        // حذف یک دهکده
        removeVillage: function(villageId) {
            const removed = getRemovedIds();
            if (!removed.includes(villageId)) {
                removed.push(villageId);
                if (saveRemovedIds(removed)) {
                    console.log(`✅ دهکده ${villageId} حذف شد`);
                    
                    // همچنین state را فوراً به‌روز کن
                    try {
                        const stateStr = localStorage.getItem("combined_cycle_state");
                        if (stateStr) {
                            const state = JSON.parse(stateStr);
                            if (state.villages && Array.isArray(state.villages)) {
                                state.villages = state.villages.filter(v => v.id !== villageId);
                                localStorage.setItem("combined_cycle_state", JSON.stringify(state));
                                console.log(`✅ state به‌روز شد`);
                            }
                        }
                    } catch (e) {
                        console.warn("خطا در به‌روزرسانی state:", e);
                    }
                    
                    return true;
                }
            }
            return false;
        },
        
        // بازگردانی یک دهکده
        restoreVillage: function(villageId) {
            const removed = getRemovedIds();
            const index = removed.indexOf(villageId);
            if (index > -1) {
                removed.splice(index, 1);
                if (saveRemovedIds(removed)) {
                    console.log(`✅ دهکده ${villageId} بازگردانی شد`);
                    return true;
                }
            }
            return false;
        },
        
        // پاک کردن همه
        clearAll: function() {
            localStorage.removeItem(REMOVED_KEY);
            console.log("✅ همه دهکده‌های حذف شده پاک شدند");
            return true;
        },
        
        // گرفتن لیست حذف شده‌ها
        getRemoved: getRemovedIds
    };
    
    console.log("✅ SimpleRemover آماده است");
})();
