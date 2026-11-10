(function (global) {
  "use strict";

  if (global.supabase && typeof global.supabase.createClient === "function") {
    // Publishable key memang digunakan di browser; keamanan data tetap bergantung pada RLS.
    global.NamaProdukSupabase = global.supabase.createClient(
      "https://smbyoqohqnnikrzsyyzr.supabase.co",
      "sb_publishable_sxVQaG_5Y2dAPzZ7yYcuBw_DZiBLzLE",
    );
  } else {
    global.NamaProdukSupabase = null;
  }
})(window);
