console.log("🤖 CombinedBot Page Script Loaded");

window.CombinedBotHelpers = {
    checkCurrentPage: function() {
        if (location.pathname.includes("dorf1.php")) return "dorf1";
        if (location.pathname.includes("dorf2.php")) return "dorf2";
        if (location.pathname.includes("build.php")) return "build";
        return "other";
    },
    getCurrentVillage: function() {
        return document.querySelector('.village.active')?.getAttribute('data-did') || 'unknown';
    }
};
