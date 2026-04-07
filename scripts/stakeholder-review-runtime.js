/* global window, document */
(function () {
  "use strict";
  var D = window.__REVIEW_DATA__;
  if (!D) return;

  var PORTFOLIO = D.portfolio;
  var SC = PORTFOLIO.scorecard;
  var VORDER = PORTFOLIO.vendors.map(function (v) {
    return v.id;
  });
  var VENDOR_BY_ID = D.vendors;
  var MANIFEST = D.manifest;
  var MILESTONES = D.milestones;
  var evalMerged = D.evalMerged;
  var FLAT = D.flatScoredSubs;
  var EVALUATOR_IDS = [];
  for (var ei = 1; ei <= 12; ei++) EVALUATOR_IDS.push("ev" + ei);

  var DRILL_PRIMARY = [
    { id: "2.0", full: "2.0  Industry Experience", label: "Partnership · Industry" },
    { id: "3.0", full: "3.0  Relevant Experience", label: "Partnership · References" },
    { id: "4.0", full: "4.0  Workforce & Delivery", label: "Operational" },
    { id: "5.0", full: "5.0  Technology Solution", label: "Technology" },
    { id: "7.0", full: "7.0  Client Migration", label: "Client & workforce migration" },
    { id: "8.0", full: "8.0  Regulatory Compliance", label: "Regulatory" },
  ];

  var VERDICT = {
    cognizant: "Deepest domain credentials; reconcile $25M story vs workbook & 100%* certainty.",
    genpact: "Lowest TCV, 7yr lock-in, certainty uncommitted (TBD) in Tab 9.0.",
    exl: "Aggressive India model; excludes severance + CCaaS — adjust TCO before comparing.",
    ibm: "Non-binding, blank efficiency, strongest governance posture on rubric.",
    sutherland: "Real TCV in 6.0; most granular migration; certainty % lowest in field.",
    ubiquity: "Above baseline — not a cost reduction proposal; workbook mostly 6.0 only.",
  };

  var QUAL_Q = {
    Q3: "What did you like most about this vendor's submission?",
    Q4: "What would need to be true for this vendor's approach to work?",
    Q5: "What is the biggest risk with this vendor?",
    Q6: "What questions would you want to drill into in the next workshop?",
    Q7: "Is there anything this vendor demonstrated that all vendors should emulate?",
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatBytes(n) {
    if (n == null || typeof n !== "number") return "—";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function mean(nums) {
    if (!nums.length) return null;
    return nums.reduce(function (a, b) {
      return a + b;
    }, 0) / nums.length;
  }

  function stdevSample(nums) {
    if (nums.length < 2) return null;
    var m = mean(nums);
    var v = nums.reduce(function (s, x) {
      return s + Math.pow(x - m, 2);
    }, 0) / (nums.length - 1);
    return Math.sqrt(v);
  }

  var STOPS = [
    [1, "#DC2626"],
    [2, "#F97316"],
    [3, "#F59E0B"],
    [3.5, "#EAB308"],
    [4, "#22C55E"],
    [5, "#059669"],
  ];
  function heatColor(score) {
    var s = Math.min(5, Math.max(1, score));
    var rgb = function (hex) {
      var h = hex.replace("#", "");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    for (var i = 0; i < STOPS.length - 1; i++) {
      var x0 = STOPS[i][0],
        c0 = STOPS[i][1],
        x1 = STOPS[i + 1][0],
        c1 = STOPS[i + 1][1];
      if (s <= x1) {
        var t = x1 === x0 ? 0 : (s - x0) / (x1 - x0);
        var r0 = rgb(c0),
          r1 = rgb(c1);
        var L = function (a, b) {
          return Math.round(a + (b - a) * t);
        };
        return "rgb(" + L(r0[0], r1[0]) + "," + L(r0[1], r1[1]) + "," + L(r0[2], r1[2]) + ")";
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  function heatColor19(x) {
    if (x == null || typeof x !== "number" || isNaN(x)) return null;
    var s = Math.min(5, Math.max(1, ((x - 1) / 8) * 4 + 1));
    return heatColor(s);
  }

  function milestonesChronological(milestones) {
    var order = {};
    milestones.forEach(function (m, i) {
      order[m.id] = i;
    });
    return milestones.slice().sort(function (a, b) {
      var ta = new Date(a.isoDate).getTime();
      var tb = new Date(b.isoDate).getTime();
      if (ta !== tb) return ta - tb;
      return (order[a.id] ?? 999) - (order[b.id] ?? 999);
    });
  }

  function daysUntil(isoDate, now) {
    var end = new Date(isoDate);
    end.setHours(23, 59, 59, 999);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (86400000)));
  }

  function progressToDate(prevIso, targetIso, now) {
    if (!prevIso) return 0;
    var start = new Date(prevIso).setHours(0, 0, 0, 0);
    var end = new Date(targetIso).setHours(23, 59, 59, 999);
    var t = now.getTime();
    if (t >= end) return 1;
    if (t <= start) return 0;
    return (t - start) / (end - start);
  }

  function prevMilestoneIso(target, ordered) {
    var idx = ordered.findIndex(function (m) {
      return m.id === target.id;
    });
    if (idx <= 0) return null;
    return ordered[idx - 1].isoDate;
  }

  function filterSnippetsForSubTab(snips, sub) {
    if (sub.id === "summary") return [];
    if (!sub.keywords || !sub.keywords.length) return snips;
    var kws = sub.keywords.map(function (k) {
      return k.toLowerCase().trim();
    });
    return snips.filter(function (s) {
      var blob = ((s.questionText || "") + " " + (s.text || "")).toLowerCase();
      return kws.some(function (k) {
        return blob.indexOf(k) >= 0;
      });
    });
  }

  function vendorsOrdered() {
    return VORDER.map(function (id) {
      return PORTFOLIO.vendors.find(function (v) {
        return v.id === id;
      });
    }).filter(Boolean);
  }

  function formatRateCell(raw) {
    var t = String(raw || "").trim();
    if (!t) return { display: "Declined", isNote: true };
    var lower = t.toLowerCase();
    if (
      lower.indexOf("declin") >= 0 ||
      lower.indexOf("fixed price") >= 0 ||
      lower.indexOf("managed service") >= 0 ||
      (lower.indexOf("provided") >= 0 && lower.indexOf("narrative") >= 0)
    ) {
      return { display: t, isNote: true };
    }
    var cleaned = t.replace(/[^0-9.\-]/g, "");
    var n = parseFloat(cleaned);
    if (!isNaN(n) && n > 0 && n < 50000) return { display: "$" + n.toFixed(2) + "/hr", isNote: false };
    return { display: t, isNote: true };
  }

  function parseRateForHeat(raw) {
    var o = formatRateCell(raw);
    if (o.isNote) return null;
    var cleaned = String(raw).replace(/[^0-9.\-]/g, "");
    var n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  function vendorBadges(id) {
    var out = [];
    if (id === "ibm") out.push({ label: "Non-binding", color: "#D97706" });
    if (id === "genpact") out.push({ label: "7yr minimum", color: "#4338CA" });
    if (id === "exl") out.push({ label: "Excl. severance / CCaaS", color: "#EA580C" });
    if (id === "ubiquity") out.push({ label: "Above baseline", color: "#DC2626" });
    return out;
  }

  function investmentLine(id, d) {
    var manual = {
      cognizant: "~$25M (proposal claim; reconcile vs workbook one-time)",
      genpact: "$23.3M",
      exl: "−$19.25M net credit (investment offset)",
      ibm: "~$11.3M (separate from operating TCV)",
      sutherland: "",
      ubiquity: "$2M transition + $3M exclusivity (per proposal narrative)",
    };
    if (manual[id]) {
      if (id === "sutherland" && d && d.oneTimeLines && d.oneTimeLines.length) {
        var sumUsd = d.oneTimeLines.reduce(function (s, o) {
          return s + (o.sumQuarterlyUsd || 0);
        }, 0);
        if (sumUsd > 0) return "$" + (sumUsd / 1e6).toFixed(2) + "M (workbook one-time)";
      }
      return manual[id] || "See listing";
    }
    if (!d || !d.oneTimeLines || !d.oneTimeLines.length) return "Not specified";
    var sum = d.oneTimeLines.reduce(function (s, o) {
      return s + (o.sumQuarterlyUsd || 0);
    }, 0);
    if (sum <= 0) return "Not specified";
    return "$" + (sum / 1e6).toFixed(2) + "M (one-time, workbook)";
  }

  function tokenize(text) {
    var STOP = {
      the: 1,
      a: 1,
      an: 1,
      and: 1,
      or: 1,
      to: 1,
      of: 1,
      in: 1,
      for: 1,
      on: 1,
      at: 1,
      by: 1,
      from: 1,
      with: 1,
      as: 1,
      is: 1,
      are: 1,
      was: 1,
      were: 1,
      be: 1,
      been: 1,
      being: 1,
      it: 1,
      this: 1,
      that: 1,
      these: 1,
      those: 1,
      our: 1,
      their: 1,
      we: 1,
      you: 1,
      your: 1,
      they: 1,
      them: 1,
      not: 1,
      no: 1,
      yes: 1,
    };
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 2 && !STOP[w];
      });
  }

  function themeCounts(qual, vendorId, limit) {
    var freq = {};
    if (!qual || !qual[vendorId]) return [];
    EVALUATOR_IDS.forEach(function (eid) {
      var row = qual[vendorId][eid];
      if (!row) return;
      Object.keys(row).forEach(function (qk) {
        var t = row[qk];
        if (!t || typeof t !== "string") return;
        tokenize(t).forEach(function (w) {
          freq[w] = (freq[w] || 0) + 1;
        });
      });
    });
    return Object.keys(freq)
      .map(function (k) {
        return { term: k, count: freq[k] };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, limit || 14);
  }

  function mount(hash) {
    var id = "section-" + hash.replace(/^#/, "").split("?")[0];
    var sec = document.getElementById(id);
    return sec ? sec.querySelector(".section-mount") : null;
  }

  function normalizeHash() {
    var h = (location.hash || "").replace(/^#/, "").trim();
    if (!h) h = "overview";
    var valid = {
      process: 1,
      overview: 1,
      workshops: 1,
      "tear-sheets": 1,
      commercial: 1,
      "drill-down": 1,
      scorecard: 1,
      "scoring-dashboard": 1,
      "evaluator-scores": 1,
      feedback: 1,
      "ideal-rfp-submission": 1,
      "vendor-submissions": 1,
      admin: 1,
      "provide-feedback": 1,
    };
    return valid[h] ? h : "overview";
  }

  function setActiveSection(hash) {
    document.querySelectorAll(".page-section").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-hash") === hash);
    });
    document.querySelectorAll(".nav-dd a").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-route") === hash);
    });
    document.querySelectorAll(".nav-single").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-route") === hash);
    });
    document.querySelectorAll(".nav-group-trigger").forEach(function (b) {
      var g = b.getAttribute("data-group");
      var open = false;
      b.parentElement.querySelectorAll(".nav-dd a").forEach(function (a) {
        if (a.getAttribute("data-route") === hash) open = true;
      });
      b.classList.toggle("active-parent", open);
    });
  }

  function go(hash) {
    if (location.hash !== "#" + hash) location.hash = hash;
    else {
      setActiveSection(hash);
      lazyRender(hash);
    }
  }

  function lazyRender(hash) {
    var m = mount(hash);
    if (!m || m.getAttribute("data-rendered")) return;
    var fn = RENDERERS[hash];
    if (fn) fn(m);
    m.setAttribute("data-rendered", "1");
  }

  function buildNav() {
    var nav = document.getElementById("hdr-nav");
    if (!nav) return;
    var groups = [
      {
        id: "g-plan",
        label: "RFP Plan",
        single: { hash: "process", label: "Timeline & process" },
      },
      {
        id: "g-assess",
        label: "RFP Assessment",
        columns: [
          {
            title: "Program & commercial",
            items: [
              { hash: "overview", label: "Overview" },
              { hash: "workshops", label: "Workshops" },
              { hash: "tear-sheets", label: "Tear sheets" },
              { hash: "commercial", label: "Commercial" },
              { hash: "drill-down", label: "Drill-down" },
            ],
          },
          {
            title: "Evaluation",
            items: [
              { hash: "scorecard", label: "Scorecard" },
              { hash: "scoring-dashboard", label: "Scoring dashboard" },
              { hash: "evaluator-scores", label: "Evaluator scores" },
              { hash: "feedback", label: "Feedback" },
            ],
          },
        ],
      },
      {
        id: "g-admin",
        label: "RFP Administration",
        columns: [
          {
            items: [
              { hash: "ideal-rfp-submission", label: "Ideal RFP submission" },
              { hash: "vendor-submissions", label: "Vendor submissions" },
              { hash: "admin", label: "Admin checklist" },
              { hash: "provide-feedback", label: "Your feedback" },
            ],
          },
        ],
      },
    ];

    var html = "";
    groups.forEach(function (g) {
      if (g.single) {
        html +=
          '<a class="nav-single" href="#' +
          esc(g.single.hash) +
          '" data-route="' +
          esc(g.single.hash) +
          '">' +
          esc(g.single.label) +
          "</a>";
        return;
      }
      html += '<div class="nav-group" data-gid="' + esc(g.id) + '">';
      html +=
        '<button type="button" class="nav-group-trigger" aria-expanded="false" data-group="' +
        esc(g.id) +
        '">' +
        esc(g.label) +
        ' <span aria-hidden="true">▾</span></button>';
      html += '<div class="nav-dd" role="menu">';
      if (g.columns.length > 1) {
        html += '<div class="nav-dd-grid">';
        g.columns.forEach(function (col) {
          html += "<div>";
          if (col.title) html += '<p class="nav-dd-section-title">' + esc(col.title) + "</p>";
          col.items.forEach(function (it) {
            html +=
              '<a href="#' +
              esc(it.hash) +
              '" data-route="' +
              esc(it.hash) +
              '" role="menuitem">' +
              esc(it.label) +
              "</a>";
          });
          html += "</div>";
        });
        html += "</div>";
      } else {
        g.columns[0].items.forEach(function (it) {
          html +=
            '<a href="#' +
            esc(it.hash) +
            '" data-route="' +
            esc(it.hash) +
            '" role="menuitem">' +
            esc(it.label) +
            "</a>";
        });
      }
      html += "</div></div>";
    });
    nav.innerHTML = html;

    nav.querySelectorAll(".nav-group-trigger").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wrap = btn.closest(".nav-group");
        var dd = wrap.querySelector(".nav-dd");
        var open = dd.classList.contains("open");
        nav.querySelectorAll(".nav-dd").forEach(function (d) {
          d.classList.remove("open");
        });
        nav.querySelectorAll(".nav-group-trigger").forEach(function (b) {
          b.classList.remove("open");
          b.setAttribute("aria-expanded", "false");
        });
        if (!open) {
          dd.classList.add("open");
          btn.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    nav.querySelectorAll(".nav-dd a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.querySelectorAll(".nav-dd").forEach(function (d) {
          d.classList.remove("open");
        });
        nav.querySelectorAll(".nav-group-trigger").forEach(function (b) {
          b.classList.remove("open");
          b.setAttribute("aria-expanded", "false");
        });
      });
    });

    document.addEventListener("click", function () {
      nav.querySelectorAll(".nav-dd").forEach(function (d) {
        d.classList.remove("open");
      });
      nav.querySelectorAll(".nav-group-trigger").forEach(function (b) {
        b.classList.remove("open");
        b.setAttribute("aria-expanded", "false");
      });
    });
  }

  // —— RENDERERS (continued in same file below) ——
  var RENDERERS = {};

  RENDERERS.process = function (el) {
    var now = new Date();
    var chrono = milestonesChronological(MILESTONES);
    var open = MILESTONES.filter(function (m) {
      return m.status === "active" || m.status === "upcoming";
    });
    var countdown = chrono.filter(function (m) {
      return m.status === "active" || m.status === "upcoming";
    }).slice(0, 3);
    var activeM = MILESTONES.find(function (m) {
      return m.status === "active";
    });
    var w1 = MILESTONES.find(function (m) {
      return m.id === "workshop1";
    });
    var vendorsW1 = (w1 && w1.vendors) || VORDER;
    var competitive = PORTFOLIO.vendors.filter(function (v) {
      return v.id !== "ubiquity";
    });
    var compMin = competitive.reduce(function (a, b) {
      return a.tcvM <= b.tcvM ? a : b;
    });
    var compMax = competitive.reduce(function (a, b) {
      return a.tcvM >= b.tcvM ? a : b;
    });
    var memosN = D.workshop1Memos && D.workshop1Memos.length ? D.workshop1Memos.length : 0;

    var stages = [
      { key: "w1", label: "1", milestoneId: "workshop1", sub: "Workshop 1" },
      { key: "ds1", label: "6→3", milestoneId: "shortlist_approved", sub: "Down-select" },
      { key: "w2", label: "2", milestoneId: "workshop2", sub: "Workshop 2" },
      { key: "ds2", label: "3→2", milestoneId: "finalists_selected", sub: "Down-select" },
      { key: "w3", label: "3", milestoneId: "workshop3", sub: "Workshop 3" },
      { key: "w4", label: "4", milestoneId: "workshop4", sub: "Workshop 4" },
      { key: "aw", label: "Award", milestoneId: "intent_to_award", sub: "Intent to award" },
    ];

    var funnel =
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px">';
    stages.forEach(function (st) {
      var mm = MILESTONES.find(function (m) {
        return m.id === st.milestoneId;
      });
      var here = mm && mm.status === "active";
      var done = mm && mm.status === "complete";
      funnel +=
        '<div class="funnel-stage' +
        (here ? " we-here" : "") +
        '"><p class="tabular-nums" style="font-size:22px;font-weight:700;color:#0F172A">' +
        esc(st.label) +
        "</p><p style=font-size:12px;color:#475569;margin:4px 0>" +
        esc(st.sub) +
        "</p>";
      if (here)
        funnel +=
          '<p style="margin:8px 0 0;font-size:11px;font-weight:600;color:#6366f1">WE ARE HERE</p>';
      if (done)
        funnel += '<p style="margin:6px 0 0;font-size:11px;color:#059669">Complete</p>';
      if (st.key === "w1") {
        funnel +=
          '<div style="margin-top:10px;font-size:11px;color:#334155;line-height:1.45">';
        vendorsW1.forEach(function (vid) {
          var v = PORTFOLIO.vendors.find(function (x) {
            return x.id === vid;
          });
          if (v)
            funnel +=
              "<div><strong style=color:" +
              esc(v.color) +
              ">" +
              esc(v.displayName) +
              "</strong> · $" +
              v.tcvM.toFixed(1) +
              "M TCV</div>";
        });
        funnel += "</div>";
      }
      funnel += "</div>";
    });
    funnel += "</div>";

    var countHtml = '<div class="countdown-grid">';
    countdown.forEach(function (m, i) {
      var isNext = i === 0;
      var isComplete = m.status === "complete";
      var daysAway = daysUntil(m.isoDate, now);
      var prev = prevMilestoneIso(m, chrono);
      var prog = progressToDate(prev, m.isoDate, now);
      var journeyPct = Math.round(prog * 100);
      var urgency = isComplete ? "#059669" : daysAway <= 3 ? "#DC2626" : daysAway <= 7 ? "#6366F1" : "#64748B";
      var barPct = isComplete
        ? 100
        : Math.min(100, Math.max(22, journeyPct + Math.max(0, 18 - Math.min(18, daysAway)) * 3));
      countHtml +=
        '<div class="card" style="' +
        (isNext ? "box-shadow:0 4px 16px rgba(99,102,241,0.12)" : "") +
        '"><p style="font-weight:600;color:#0F172A;margin:0 0 8px">' +
        esc(m.label) +
        "</p>";
      if (isComplete) countHtml += '<p style="font-size:16px;font-weight:700;color:#059669">Complete ✓</p>';
      else {
        countHtml +=
          '<p><span class="tabular-nums" style="font-size:28px;font-weight:700;color:' +
          urgency +
          '">' +
          daysAway +
          '</span> <span style="color:#334155">' +
          (daysAway === 1 ? "day" : "days") +
          "</span></p>";
      }
      countHtml +=
        '<p class="tabular-nums" style="color:#334155;font-size:13px">' +
        esc(m.date) +
        "</p>";
      if (m.detail)
        countHtml +=
          '<p style="font-size:13px;color:#334155;margin-top:8px;line-height:1.45">' +
          esc(m.detail) +
          "</p>";
      countHtml +=
        '<div style="margin-top:12px;height:3px;background:#E2E8F0;border-radius:99px;overflow:hidden"><div style="height:100%;width:' +
        barPct +
        "%;background:" +
        urgency +
        '"></div></div><p class="tabular-nums" style="text-align:right;font-size:11px;color:#334155;margin:4px 0 0">' +
        journeyPct +
        "%</p></div>";
    });
    countHtml += "</div>";

    var timeline = "";
    chrono.forEach(function (m) {
      var badge =
        m.status === "complete"
          ? '<span style="background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:6px;font-size:11px">Complete</span>'
          : m.status === "active"
            ? '<span style="background:#EEF2FF;color:#4338CA;padding:2px 8px;border-radius:6px;font-size:11px">Active</span>'
            : '<span style="background:#F1F5F9;color:#64748B;padding:2px 8px;border-radius:6px;font-size:11px">Upcoming</span>';
      timeline +=
        '<div class="card" style="padding:14px 16px;margin-bottom:10px;border-left:4px solid #CBD5E1"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><p style="font-weight:600;color:#0F172A;margin:0">' +
        esc(m.label) +
        '</p><p class="tabular-nums" style="font-size:13px;color:#475569;margin:6px 0 0">' +
        esc(m.date) +
        "</p></div>" +
        badge +
        "</div>";
      if (m.detail)
        timeline +=
          '<p style="font-size:14px;color:#334155;margin:10px 0 0;line-height:1.55">' +
          esc(m.detail) +
          "</p>";
      timeline += "</div>";
    });

    var rp = D.rfpProgram;
    var t0 = new Date(rp.rangeStart).getTime();
    var t1 = new Date(rp.rangeEnd).getTime();
    var range = t1 - t0 || 1;
    var phaseMap = {};
    rp.phases.forEach(function (p) {
      phaseMap[p.id] = p;
    });
    var gantt = '<div class="card gantt-wrap"><h2 style="margin:0 0 8px;font-size:18px;color:#0F172A">Program Gantt</h2><p class="p-sub" style="margin-bottom:12px">Feb–Jul 2026 program view (same data as Next.js Process page).</p>';
    rp.rows.forEach(function (row) {
      var ph = phaseMap[row.phaseId] || { bar: "#64748b" };
      var a = new Date(row.startIso).getTime();
      var b = new Date(row.endIso).getTime();
      var left = ((a - t0) / range) * 100;
      var width = ((b - a) / range) * 100;
      left = Math.max(0, left);
      width = Math.max(0.4, Math.min(100 - left, width));
      gantt +=
        '<div class="gantt-row"><div class="gantt-label">' +
        esc(row.activity) +
        '</div><div class="gantt-track"><div class="gantt-bar" style="left:' +
        left +
        "%;width:" +
        width +
        "%;background:" +
        esc(ph.bar) +
        '"></div></div><span class="tabular-nums" style="font-size:11px;color:#64748B;width:120px">' +
        esc(row.type) +
        "</span></div>";
    });
    gantt += "</div>";

    el.innerHTML =
      "<h1 class='p-title'>Timeline &amp; process</h1><p class='p-sub'>Milestones, evaluation funnel, and master program timeline.</p>" +
      "<h2 style='font-size:16px;color:#0F172A;margin:24px 0 12px'>Evaluation funnel</h2>" +
      funnel +
      '<div class="grid" style="margin-bottom:20px">' +
      '<div class="card"><p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569">Vendors evaluated</p><p class="tabular-nums" style="font-size:22px;font-weight:700;color:#0F172A">6</p></div>' +
      '<div class="card"><p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569">Workshop 1 memos</p><p class="tabular-nums" style="font-size:22px;font-weight:700;color:#0F172A">' +
      memosN +
      "</p></div>" +
      '<div class="card"><p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569">Bid range (excl. Ubiquity)</p><p class="tabular-nums" style="font-size:22px;font-weight:700;color:#0F172A">$' +
      compMin.tcvM.toFixed(0) +
      "M – $" +
      compMax.tcvM.toFixed(0) +
      'M</p></div>' +
      '<div class="card"><p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569">Next gate</p><p style="font-size:14px;font-weight:600;color:#0F172A">' +
      esc((activeM && activeM.label) || "—") +
      "</p></div></div>" +
      "<h2 style='font-size:16px;color:#0F172A;margin:8px 0 12px'>Next milestone countdowns</h2>" +
      countHtml +
      "<h2 style='font-size:16px;color:#0F172A;margin:28px 0 12px'>Vertical timeline</h2>" +
      timeline +
      gantt;
  };

  function renderMemoSection(sec, depth) {
    depth = depth || 0;
    var h = "<div style='margin-top:12px'>";
    if (sec.title) {
      if (depth === 0) {
        h +=
          "<h3 style='font-size:16px;margin:20px 0 10px;color:#0F172A;border-bottom:1px solid #E2E8F0;padding-bottom:6px'>" +
          esc(sec.title) +
          "</h3>";
      } else {
        h += "<p style='font-weight:600;font-size:13px;margin:12px 0 6px'>" + esc(sec.title) + "</p>";
      }
    }
    (sec.paragraphs || []).forEach(function (p) {
      h += "<p style='font-size:14px;line-height:1.6;margin:8px 0;color:#334155'>" + esc(p) + "</p>";
    });
    if ((sec.bullets || []).length) {
      h += "<ul style='margin:8px 0;padding-left:20px;line-height:1.55;font-size:14px'>";
      sec.bullets.forEach(function (b) {
        h += "<li>" + esc(b) + "</li>";
      });
      h += "</ul>";
    }
    (sec.subSections || []).forEach(function (sub) {
      h += "<div style='margin-top:10px;border-left:2px solid #E2E8F0;padding-left:12px'>";
      h += "<p style='font-weight:600;font-size:12px;margin:0 0 6px'>" + esc(sub.title) + "</p>";
      (sub.bullets || []).forEach(function (b) {
        h += "<p style='font-size:13px;line-height:1.55;margin:6px 0 6px 4px'>" + esc(b) + "</p>";
      });
      h += "</div>";
    });
    h += "</div>";
    return h;
  }

  RENDERERS.overview = function (el) {
    var competitive = PORTFOLIO.vendors.filter(function (v) {
      return v.id !== "ubiquity";
    });
    var compMin = competitive.reduce(function (a, b) {
      return a.tcvM <= b.tcvM ? a : b;
    });
    var compMax = competitive.reduce(function (a, b) {
      return a.tcvM >= b.tcvM ? a : b;
    });
    var byTcv = PORTFOLIO.vendors.slice().sort(function (a, b) {
      return a.tcvM - b.tcvM;
    });
    var baseline5 = PORTFOLIO.baselineAnnualM.mid * 5;
    var shortlistM = MILESTONES.find(function (m) {
      return m.id === "shortlist_approved";
    });
    var downDays = shortlistM ? daysUntil(shortlistM.isoDate, new Date()) : 0;

    var hero =
      '<section style="text-align:center;padding:8px 0 24px">' +
      '<p class="tabular-nums" style="font-size:36px;font-weight:700;color:#0F172A;margin:0">$' +
      compMin.tcvM.toFixed(0) +
      "M — $" +
      compMax.tcvM.toFixed(0) +
      'M</p><p style="color:#475569;margin:12px 0 0">5-year operating TCV competitive range (excl. Ubiquity)</p>' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:24px;margin-top:20px;max-width:720px;margin-left:auto;margin-right:auto">' +
      '<div><p class="tabular-nums" style="font-size:18px;font-weight:600;color:#0F172A;margin:0">$' +
      baseline5.toFixed(1) +
      'M</p><p style="font-size:11px;color:#475569;margin:4px 0 0">5-yr baseline (mid × 5)</p></div>' +
      '<div><p class="tabular-nums" style="font-size:18px;font-weight:600;color:#0F172A;margin:0">$' +
      PORTFOLIO.synergyTargetM +
      'M/yr</p><p style="font-size:11px;color:#475569;margin:4px 0 0">Synergy target</p></div>' +
      '<div><p class="tabular-nums" style="font-size:18px;font-weight:600;color:#0F172A;margin:0">6</p><p style="font-size:11px;color:#475569;margin:4px 0 0">Vendors</p></div>' +
      '<div><p style="font-size:18px;font-weight:600;color:#0F172A;margin:0">' +
      esc((shortlistM && shortlistM.date) || "") +
      '</p><p style="font-size:11px;color:#475569;margin:4px 0 0">Shortlist window</p></div></div>' +
      '<p style="font-size:13px;color:#475569;max-width:36rem;margin:16px auto 0">Workshop 1 complete · Down-selection ' +
      esc((shortlistM && shortlistM.date) || "") +
      " (" +
      downDays +
      (downDays === 1 ? " day" : " days") +
      ' to end of window) — <a href="#process" style="color:#0F172A;font-weight:600">View process</a></p></section>';

    var cards = '<div class="grid">';
    byTcv.forEach(function (v, i) {
      var d = VENDOR_BY_ID[v.id];
      var y = (d && d.pricing && d.pricing.years) || [];
      var ytxt = [1, 2, 3]
        .map(function (yr) {
          var row = y.find(function (x) {
            return x.year === yr;
          });
          return row ? "$" + row.valueM.toFixed(1) + "M" : "—";
        })
        .join(" · ");
      var comp = v.composite != null && !isNaN(v.composite) ? v.composite.toFixed(1) : "—";
      var rankNote = v.composite == null ? " (by TCV)" : "";
      var q =
        v.id === "ibm"
          ? '<span style="font-size:11px;color:#D97706">Non-binding</span>'
          : v.id === "ubiquity"
            ? '<span style="font-size:11px;color:#DC2626">Above baseline</span>'
            : "";
      cards +=
        '<div class="card" style="border-top:3px solid ' +
        esc(v.color) +
        '"><p style="font-weight:600;color:' +
        esc(v.color) +
        ';text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin:0">' +
        esc(v.displayName) +
        "</p>" +
        '<p style="font-size:10px;margin:8px 0"><span style="background:' +
        esc(v.color) +
        '1A;color:' +
        esc(v.color) +
        ';padding:4px 10px;border-radius:999px;font-weight:600">Rank #' +
        (i + 1) +
        rankNote +
        "</span></p>" +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px">' +
        '<div><p class="tabular-nums" style="font-size:26px;font-weight:700;margin:0;color:#0F172A">$' +
        v.tcvM.toFixed(1) +
        'M</p><span style="font-size:12px;color:#475569">5-yr TCV</span></div>' +
        '<div style="text-align:right"><p class="tabular-nums" style="font-size:24px;font-weight:600;margin:0">' +
        comp +
        '</p><span style="font-size:11px;color:#475569">Composite</span></div></div>' +
        (q ? "<p style='margin:8px 0 0'>" + q + "</p>" : "") +
        '<p style="font-size:13px;color:#334155;margin:10px 0;line-height:1.5">' +
        esc(VERDICT[v.id] || "") +
        "</p>" +
        '<p style="font-size:12px;color:#475569"><strong>Vendor investment:</strong> ' +
        esc(investmentLine(v.id, d)) +
        "</p>" +
        '<p class="tabular-nums" style="font-size:12px;color:#475569"><strong>Y1–Y3 (Tab 6.0):</strong> ' +
        ytxt +
        "</p>" +
        '<p style="margin-top:12px;font-size:12px"><a href="#commercial" style="color:#1E40AF;font-weight:600">Commercial</a> · <a href="#scorecard" style="color:#1E40AF;font-weight:600">Scorecard</a></p></div>';
    });
    cards += "</div>";

    var mx = Math.max.apply(
      null,
      PORTFOLIO.vendors.map(function (x) {
        return x.tcvM;
      }),
    );
    var bars = '<div class="card"><h2 style="margin:0 0 12px;font-size:16px;color:#0F172A">TCV comparison ($M)</h2>';
    PORTFOLIO.vendors
      .slice()
      .sort(function (a, b) {
        return a.tcvM - b.tcvM;
      })
      .forEach(function (v) {
        var pct = (v.tcvM / mx) * 100;
        bars +=
          '<div style="display:flex;align-items:center;gap:10px;margin:8px 0;font-size:12px"><span style="width:92px;font-weight:600;color:' +
          esc(v.color) +
          '">' +
          esc(v.displayName) +
          '</span><div class="bar-track"><div class="bar-fill" style="width:' +
          pct +
          "%;background:" +
          esc(v.color) +
          '"></div></div><span class="tabular-nums" style="width:72px;text-align:right">' +
          v.tcvM.toFixed(1) +
          "M</span></div>";
      });
    bars += "</div>";

    el.innerHTML =
      "<h1 class='p-title'>Executive overview</h1><p class='p-sub'>TCV from Appendix B Tab 6.0; composite scores from Workshop 1 evaluator import (1–9 scale, weighted pillars).</p>" +
      hero +
      cards +
      bars;
  };

  RENDERERS.workshops = function (el) {
    var memos = D.workshop1Memos;
    var h =
      "<h1 class='p-title'>Workshops</h1><p class='p-sub'>Workshop 1 executive memos; Workshops 2–4 preparation views.</p><h2 style='font-size:17px;color:#0F172A;margin:24px 0 12px'>Workshop 1</h2>";
    if (!memos || !memos.length) {
      h +=
        '<div class="warn"><strong>No memo data in bundle.</strong> Ensure workshop1_memos.json is present in src/data and rebuild.</div>';
    } else {
      var vpills = "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px'>";
      memos.forEach(function (m, i) {
        var col = (PORTFOLIO.vendors.find(function (v) {
          return v.id === m.vendorId;
        }) || {}).color || "#64748b";
        vpills +=
          '<button type="button" class="pill wsp" data-i="' +
          i +
          '" style="' +
          (i === 0 ? "border-color:" + col + ";color:" + col + ";background:" + col + "1A;font-weight:600" : "") +
          '">' +
          esc(m.vendorName || m.vendorId) +
          "</button>";
      });
      vpills += "</div><div id='ws-body-inline'></div>";
      h += vpills;
    }
    [2, 3, 4].forEach(function (n) {
      var c = D.workshopEmptyCopy[n];
      var ag = D.workshopAgenda[n] || [];
      if (!c) return;
      h +=
        '<div class="card print-break" style="margin-top:24px"><h2 style="margin:0 0 8px;font-size:17px;color:#0F172A">' +
        esc(c.title) +
        "</h2>" +
        '<p style="color:#475569;font-size:14px">' +
        esc(c.topic) +
        "</p>" +
        '<p class="meta">' +
        esc(c.dateLine) +
        "</p>" +
        '<p style="font-size:13px;color:#334155"><strong>Vendor status:</strong> ' +
        esc(c.vendorLine) +
        "</p><h3 style='font-size:14px;margin:16px 0 8px'>Agenda focus</h3><ul style='margin:0;padding-left:20px;line-height:1.55;color:#334155'>";
      ag.forEach(function (a) {
        h +=
          "<li><strong>" +
          esc(a.title) +
          "</strong> — " +
          esc(a.description) +
          "</li>";
      });
      h += "</ul></div>";
    });
    el.innerHTML = h;
    if (memos && memos.length) {
      var wrap = el;
      function showWs(idx) {
        var m = memos[idx];
        var col = (PORTFOLIO.vendors.find(function (v) {
          return v.id === m.vendorId;
        }) || {}).color || "#6366f1";
        var parts =
          '<div class="card" style="border-top:3px solid ' +
          col +
          '"><p style="font-weight:600;color:' +
          col +
          ';margin:0;font-size:15px">' +
          esc(m.vendorName) +
          "</p>";
        if (m.date) parts += "<p class='meta'>" + esc(m.date) + "</p>";
        parts +=
          '<p style="font-size:15px;line-height:1.65;margin:12px 0;white-space:pre-wrap">' +
          esc(m.bottomLine || "") +
          "</p>";
        (m.sections || []).forEach(function (sec) {
          parts += renderMemoSection(sec, 0);
        });
        parts += "</div>";
        var wb = wrap.querySelector("#ws-body-inline");
        if (wb) wb.innerHTML = parts;
        wrap.querySelectorAll(".wsp").forEach(function (p) {
          var on = +p.getAttribute("data-i") === idx;
          var mm = memos[+p.getAttribute("data-i")];
          var c2 = (PORTFOLIO.vendors.find(function (v) {
            return v.id === mm.vendorId;
          }) || {}).color || "#64748b";
          p.style.borderColor = on ? c2 : "#E2E8F0";
          p.style.color = on ? c2 : "inherit";
          p.style.background = on ? c2 + "1A" : "#fff";
          p.style.fontWeight = on ? "600" : "500";
        });
      }
      el.querySelectorAll(".wsp").forEach(function (b) {
        b.addEventListener("click", function () {
          showWs(+b.getAttribute("data-i"));
        });
      });
      showWs(0);
    }
  };

  RENDERERS["tear-sheets"] = function (el) {
    var TS = D.tearSheets || {};
    var pills = "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px'>";
    VORDER.forEach(function (id, i) {
      var v = PORTFOLIO.vendors.find(function (x) {
        return x.id === id;
      });
      var c = v ? v.color : "#64748b";
      pills +=
        '<button type="button" class="pill tsp" data-id="' +
        id +
        '" style="' +
        (i === 0 ? "border-color:" + c + ";color:" + c + ";background:" + c + "1A;font-weight:600" : "") +
        '">' +
        esc((v && v.displayName) || id) +
        "</button>";
    });
    pills += "</div><div id='tear-inline'></div>";
    el.innerHTML =
      "<h1 class='p-title'>Tear sheets</h1><p class='p-sub'>Structured synthesis for board-ready review.</p>" + pills;

    function showTear(id) {
      var v = PORTFOLIO.vendors.find(function (x) {
        return x.id === id;
      });
      var t = TS[id];
      var tb = el.querySelector("#tear-inline");
      if (!t || !v) {
        tb.innerHTML = "<div class='warn'>No tear sheet block for this vendor.</div>";
        return;
      }
      var y1 = "—";
      var d = VENDOR_BY_ID[id];
      if (d && d.pricing && d.pricing.years && d.pricing.years[0]) y1 = "$" + d.pricing.years[0].valueM.toFixed(1) + "M";
      var comp = v.composite != null && !isNaN(v.composite) ? v.composite.toFixed(1) : "—";
      var side =
        '<div class="card" style="padding:14px"><p style="font-size:11px;font-weight:600;color:#475569;text-transform:uppercase">Quick stats</p>' +
        '<p class="tabular-nums" style="font-size:20px;font-weight:700;margin:8px 0">$' +
        v.tcvM.toFixed(1) +
        'M</p><p style="font-size:11px;color:#475569">5-yr TCV</p>' +
        '<p class="tabular-nums" style="font-size:16px;font-weight:600;margin:12px 0 4px">' +
        y1 +
        '</p><p style="font-size:11px;color:#475569">Y1 fees</p>' +
        '<p class="tabular-nums" style="font-size:16px;font-weight:600;margin:12px 0 4px">' +
        comp +
        '</p><p style="font-size:11px;color:#475569">Composite</p></div>';

      function ul(title, arr) {
        if (!arr || !arr.length) return "";
        return (
          '<p style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569;font-weight:600;margin:18px 0 8px">' +
          esc(title) +
          "</p><ul style='margin:0 0 4px 18px;line-height:1.55;font-size:14px;color:#334155'>" +
          arr
            .map(function (x) {
              return "<li>" + esc(x) + "</li>";
            })
            .join("") +
          "</ul>"
        );
      }

      tb.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 220px;gap:20px;align-items:start">' +
        '<div class="card" style="border-top:3px solid ' +
        esc(v.color) +
        '"><h2 style="color:' +
        esc(v.color) +
        ';margin:0 0 10px;font-size:18px">' +
        esc(v.displayName) +
        "</h2>" +
        '<p style="font-size:15px;line-height:1.65;color:#334155">' +
        esc(t.bottomLine) +
        "</p>" +
        ul("Key assumptions", t.assumptions) +
        ul("Strengths", t.strengths) +
        ul("Risks", t.risks) +
        ul("Workshop questions", t.workshopQuestions) +
        ul("Go-forward", t.goForward) +
        "</div>" +
        side +
        "</div>";

      el.querySelectorAll(".tsp").forEach(function (p) {
        var on = p.getAttribute("data-id") === id;
        var vid = p.getAttribute("data-id");
        var vv = PORTFOLIO.vendors.find(function (x) {
          return x.id === vid;
        });
        var tc = vv ? vv.color : "#64748b";
        p.style.borderColor = on ? tc : "#E2E8F0";
        p.style.background = on ? tc + "1A" : "#fff";
        p.style.fontWeight = on ? "600" : "500";
      });
    }
    el.querySelectorAll(".tsp").forEach(function (b) {
      b.addEventListener("click", function () {
        showTear(b.getAttribute("data-id"));
      });
    });
    showTear(VORDER[0]);
  };

  function rateHeatBg(val, lo, hi) {
    if (val == null || isNaN(val) || hi <= lo) return "#F8FAFC";
    var t = (val - lo) / (hi - lo);
    t = Math.max(0, Math.min(1, t));
    var r = Math.round(34 + (220 - 34) * t);
    var g = Math.round(197 + (38 - 197) * t);
    var b = Math.round(94 + (38 - 94) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function filterDrillSubSnips(snips, sub) {
    if (!sub || sub.id === "summary" || !sub.keywords || !sub.keywords.length) return snips || [];
    return filterSnippetsForSubTab(snips || [], sub);
  }

  RENDERERS.commercial = function (el) {
    var mid = PORTFOLIO.baselineAnnualM.mid;
    var low = PORTFOLIO.baselineAnnualM.low;
    var syn = PORTFOLIO.synergyTargetM;
    var vendors = VORDER.map(function (id) {
      return VENDOR_BY_ID[id];
    }).filter(Boolean);
    var pvsort = PORTFOLIO.vendors.slice().sort(function (a, b) {
      return a.tcvM - b.tcvM;
    });
    var competitive = PORTFOLIO.vendors.filter(function (v) {
      return v.id !== "ubiquity";
    });
    var cmin = competitive.reduce(function (a, b) {
      return a.tcvM <= b.tcvM ? a : b;
    });
    var cmax = competitive.reduce(function (a, b) {
      return a.tcvM >= b.tcvM ? a : b;
    });
    var lead = pvsort[0];

    var h =
      "<h1 class='p-title'>Commercial</h1><p class='p-sub'>Vendors converge by Y3 — headline TCV mixes fixed-fee and rate-card mechanics; normalize COLA, exclusions, and scope before comparing. Baseline mid ~$" +
      mid.toFixed(1) +
      "M/yr illustrative.</p>";

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A'>1. Five-year TCV comparison</h2><p class='p-sub'>Who offers the lowest total cost of ownership over the contract term on a comparable 5-year operating basis?</p>";
    h +=
      "<h3 style='font-size:17px;color:#0F172A;margin:12px 0'>" +
      esc(lead.displayName) +
      " leads at $" +
      lead.tcvM.toFixed(0) +
      "M — validate certainty and structural badges before locking a floor.</h3>";
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:16px 0">';
    pvsort.forEach(function (pv) {
      var bs = vendorBadges(pv.id);
      h +=
        '<div class="card" style="padding:12px;border-top:3px solid ' +
        esc(pv.color) +
        '"><p style="font-size:11px;font-weight:700;color:' +
        esc(pv.color) +
        '">' +
        esc(pv.displayName) +
        '</p><p class="tabular-nums" style="font-size:22px;font-weight:700;margin:6px 0">' +
        "$" +
        pv.tcvM.toFixed(1) +
        "M</p>";
      bs.forEach(function (b) {
        h +=
          '<span style="font-size:10px;padding:2px 8px;border-radius:6px;margin:2px 4px 0 0;display:inline-block;border:1px solid #E2E8F0">' +
          esc(b.label) +
          "</span>";
      });
      h += "</div>";
    });
    h += "</div>";
    h +=
      '<div class="card" style="background:#F8FAFC"><p style="font-size:14px;color:#334155;line-height:1.55">The competitive range is roughly $' +
      cmin.tcvM.toFixed(0) +
      "–$" +
      cmax.tcvM.toFixed(0) +
      "M on a 5-year operating basis vs baseline — but headline TCV is not apples-to-apples until COLA mechanics, exclusions (EXL), and non-binding posture (IBM) are normalized. Ubiquity near $" +
      (PORTFOLIO.vendors.find(function (x) {
        return x.id === "ubiquity";
      }) || { tcvM: 0 }).tcvM.toFixed(0) +
      "M is a continuity anchor, not a synergy bid.</p></div></section>";

    var maxY = 0;
    vendors.forEach(function (v) {
      (v.pricing && v.pricing.years ? v.pricing.years : []).forEach(function (y) {
        if (y.valueM > maxY) maxY = y.valueM;
      });
    });
    if (maxY < mid * 1.2) maxY = mid * 1.2;

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>2. Annual fee trajectory</h2><p class='p-sub'>How do fees change year-over-year — dashed grey: lower bound; mid-case baseline ~$" +
      mid.toFixed(1) +
      "M/yr.</p>";
    h +=
      "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Vendor</th><th>Y1</th><th>Y2</th><th>Y3</th><th>Y4</th><th>Y5</th></tr></thead><tbody>";
    vendors.forEach(function (v) {
      h += "<tr><td style='font-weight:600;color:" + esc(v.color) + "'>" + esc(v.displayName) + "</td>";
      for (var yr = 1; yr <= 5; yr++) {
        var row = (v.pricing && v.pricing.years ? v.pricing.years : []).find(function (x) {
          return x.year === yr;
        });
        h += "<td class='tabular-nums'>" + (row ? "$" + row.valueM.toFixed(2) + "M" : "—") + "</td>";
      }
      h += "</tr>";
    });
    h += "<tr><td style='font-weight:600'>Baseline (mid)</td>";
    for (var y2 = 1; y2 <= 5; y2++) {
      h += "<td class='tabular-nums'>$" + mid.toFixed(2) + "M</td>";
    }
    h += "</tr></tbody></table></div>";
    h += '<p style="font-size:12px;color:#475569;margin:12px 0">Mini chart (height ∝ annual fee):</p><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">';
    vendors.forEach(function (v) {
      h += '<div style="flex:1;min-width:120px"><p style="font-size:11px;font-weight:600;color:' + esc(v.color) + ';text-align:center">' + esc(v.displayName) + "</p><div style='display:flex;align-items:flex-end;gap:3px;height:120px;margin-top:8px'>";
      for (var yr3 = 1; yr3 <= 5; yr3++) {
        var row2 = (v.pricing && v.pricing.years ? v.pricing.years : []).find(function (x) {
          return x.year === yr3;
        });
        var val = row2 ? row2.valueM : 0;
        var pct = maxY ? (val / maxY) * 100 : 0;
        h +=
          '<div style="flex:1;background:' +
          esc(v.color) +
          ";opacity:0.85;height:" +
          Math.max(4, pct) +
          '%;border-radius:3px 3px 0 0" title="Y' +
          yr3 +
          " " +
          (row2 ? "$" + row2.valueM.toFixed(1) + "M" : "—") +
          '"></div>';
      }
      h += "</div></div>";
    });
    h += "</div></section>";

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>3. Cumulative savings vs baseline</h2><p class='p-sub'>Positive = cumulative operating spend below mid baseline through that year (workbook fees). Target envelope $" +
      syn +
      "M/yr by FY28.</p>";
    h +=
      "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Vendor</th><th>Thru Y1</th><th>Thru Y2</th><th>Thru Y3</th><th>Thru Y4</th><th>Thru Y5</th></tr></thead><tbody>";
    vendors.forEach(function (v) {
      h += "<tr><td style='font-weight:600;color:" + esc(v.color) + "'>" + esc(v.displayName) + "</td>";
      var cum = 0;
      for (var yi = 1; yi <= 5; yi++) {
        var rw = (v.pricing && v.pricing.years ? v.pricing.years : []).find(function (x) {
          return x.year === yi;
        });
        cum += rw ? rw.valueM : 0;
        var baseCum = mid * yi;
        var delta = baseCum - cum;
        var bg = delta >= 0 ? "#ECFDF5" : "#FEF2F2";
        h +=
          "<td class='tabular-nums' style='background:" +
          bg +
          "'>$" +
          delta.toFixed(1) +
          "M</td>";
      }
      h += "</tr>";
    });
    h += "</tbody></table></div></section>";

    var allRates = [];
    vendors.forEach(function (v) {
      (v.rateCard || []).slice(0, 8).forEach(function (r) {
        var a = parseRateForHeat(r.onshore || "");
        var b = parseRateForHeat(r.offshore || "");
        if (a != null) allRates.push(a);
        if (b != null) allRates.push(b);
      });
    });
    var rlo = allRates.length ? Math.min.apply(null, allRates) : 0;
    var rhi = allRates.length ? Math.max.apply(null, allRates) : 1;

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>4. Rate card comparison</h2><p class='p-sub'>Lower $/hr is better where numeric. Blank / narrative cells shown as italic.</p>";
    h +=
      "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Vendor · row</th><th>Onshore</th><th>Offshore</th></tr></thead><tbody>";
    vendors.forEach(function (v) {
      (v.rateCard || []).slice(0, 4).forEach(function (r) {
        var on = formatRateCell(r.onshore || "");
        var off = formatRateCell(r.offshore || "");
        var onn = parseRateForHeat(r.onshore || "");
        var offn = parseRateForHeat(r.offshore || "");
        var onBg = onn != null ? rateHeatBg(onn, rlo, rhi) : "";
        var offBg = offn != null ? rateHeatBg(offn, rlo, rhi) : "";
        h +=
          "<tr><td style='font-weight:600;color:" +
          esc(v.color) +
          "'>" +
          esc(v.displayName + ": " + r.label) +
          "</td><td style='" +
          (onBg ? "background:" + onBg + ";" : "") +
          (on.isNote ? "font-style:italic;color:#DC2626;" : "") +
          "'>" +
          esc(on.display) +
          "</td><td style='" +
          (offBg ? "background:" + offBg + ";" : "") +
          (off.isNote ? "font-style:italic;color:#DC2626;" : "") +
          "'>" +
          esc(off.display) +
          "</td></tr>";
      });
    });
    h += "</tbody></table></div>";

    h += "<h3 style='margin-top:20px;font-size:16px;color:#0F172A'>Heatmap — numeric $/hr (darker green ≈ lower rate)</h3><p class='meta'>Sample rows per vendor; IBM often declines granular 6.1 lines.</p>";
    h +=
      "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Row</th>" +
      vendors
        .map(function (v) {
          return "<th style='color:" + esc(v.color) + "'>" + esc(v.displayName) + "</th>";
        })
        .join("") +
      "</tr></thead><tbody>";
    var maxRows = 6;
    for (var ri = 0; ri < maxRows; ri++) {
      var label = "";
      vendors.forEach(function (v) {
        var rc = v.rateCard || [];
        if (ri === 0 && rc[0]) label = rc[0].label || "Row " + ri;
      });
      h += "<tr><td style='font-weight:500'>" + esc(label || "Tier " + ri) + "</td>";
      vendors.forEach(function (v) {
        var rc = v.rateCard || [];
        var r = rc[ri];
        if (!r) {
          h += "<td>—</td>";
          return;
        }
        var onn2 = parseRateForHeat(r.onshore || "");
        var offn2 = parseRateForHeat(r.offshore || "");
        var pick = onn2 != null ? onn2 : offn2;
        var o = formatRateCell((onn2 != null ? r.onshore : r.offshore) || "");
        var bg2 = pick != null ? rateHeatBg(pick, rlo, rhi) : "#F8FAFC";
        h +=
          "<td class='tabular-nums' style='background:" +
          bg2 +
          ";" +
          (o.isNote ? "font-style:italic;font-size:12px;" : "") +
          "'>" +
          esc(o.display) +
          "</td>";
      });
      h += "</tr>";
    }
    h += "</tbody></table></div></section>";

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>5. Operational efficiency (Tab 9.0)</h2><p class='p-sub'>Read each percentage beside certainty language before treating savings as bankable.</p>";
    vendors.forEach(function (v) {
      var rows = (v.efficiency && v.efficiency.rows) || [];
      var headers = (v.efficiency && v.efficiency.headers) || [];
      h += '<div class="card" style="margin-top:14px"><p style="font-weight:700;color:' + esc(v.color) + '">' + esc(v.displayName) + "</p>";
      if (!rows.length) {
        h += "<p class='meta'>No Tab 9.0 grid extracted.</p></div>";
        return;
      }
      h += "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Geo</th>";
      headers.forEach(function (hd) {
        h += "<th>" + esc(hd) + "</th>";
      });
      h += "</tr></thead><tbody>";
      rows.forEach(function (row) {
        h += "<tr><td style='font-weight:600'>" + esc(row.geography) + "</td>";
        headers.forEach(function (hd) {
          var cell = (row.cells && row.cells[hd]) || "—";
          h += "<td style='font-size:12px'>" + esc(cell) + "</td>";
        });
        h += "</tr>";
      });
      h += "</tbody></table></div></div>";
    });
    h += "</section>";

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>6. One-time transition costs</h2>";
    h +=
      "<div style='overflow-x:auto'><table class='data-table'><thead><tr><th>Vendor</th><th>Category</th><th class='tabular-nums'>Sum ($M)</th></tr></thead><tbody>";
    vendors.forEach(function (v) {
      var lines = v.oneTimeLines || [];
      if (!lines.length) {
        h +=
          "<tr><td style='color:" +
          esc(v.color) +
          "'>" +
          esc(v.displayName) +
          "</td><td colspan='2' class='meta'>No one-time lines extracted</td></tr>";
        return;
      }
      lines.forEach(function (ln) {
        h +=
          "<tr><td style='color:" +
          esc(v.color) +
          "'>" +
          esc(v.displayName) +
          "</td><td>" +
          esc(ln.label || ln.category || "—") +
          "</td><td class='tabular-nums'>" +
          (ln.sumQuarterlyUsd != null ? (ln.sumQuarterlyUsd / 1e6).toFixed(2) : "—") +
          "</td></tr>";
      });
    });
    h += "</tbody></table></div></section>";

    h +=
      "<section class='print-break'><h2 style='font-size:18px;color:#0F172A;margin-top:28px'>7. COLA &amp; cost escalation</h2><details class='details-block'><summary>Show / hide COLA assumptions by vendor</summary>";
    vendors.forEach(function (v) {
      var ca = v.colaAssumptions;
      h += '<div class="card" style="margin-top:12px"><p style="font-weight:600;color:' + esc(v.color) + '">' + esc(v.displayName) + "</p>";
      if (!ca) h += "<p class='meta'>No structured COLA object in extract.</p>";
      else {
        if (ca.summary) h += "<p style='font-size:14px;color:#334155'>" + esc(ca.summary) + "</p>";
        h += "<pre style='font-size:12px;background:#F8FAFC;padding:12px;border-radius:8px;overflow:auto'>" + esc(JSON.stringify(ca, null, 2)) + "</pre>";
      }
      h += "</div>";
    });
    h += "</details></section>";

    el.innerHTML = h;
  };

  RENDERERS["drill-down"] = function (el) {
    var primaryIdx = 0;
    var subIdx = 0;

    function blockForTab(v, tabId) {
      var meta = DRILL_PRIMARY.find(function (p) {
        return p.id === tabId;
      });
      var full = meta ? meta.full : "";
      var blocks = v.drilldownSnippets || [];
      var hit = blocks.find(function (b) {
        return b.tab === full;
      });
      if (hit) return hit;
      return blocks.find(function (b) {
        return b.tab.indexOf(tabId) >= 0 && b.tab.indexOf("Q: ") !== 0;
      });
    }

    function paint() {
      var tabId = DRILL_PRIMARY[primaryIdx].id;
      var subs = (D.drillSubTabs && D.drillSubTabs[tabId]) || [{ id: "summary", label: "Summary", keywords: [] }];
      if (subIdx >= subs.length) subIdx = 0;
      var sub = subs[subIdx];
      var pHtml =
        "<h1 class='p-title'>Drill-down</h1><p class='p-sub'>Appendix B excerpts by section. Sub-tabs filter question/response text (summary shows full block).</p>";
      pHtml += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0" class="no-print">';
      DRILL_PRIMARY.forEach(function (p, i) {
        pHtml +=
          '<button type="button" class="pill dpt" data-pi="' +
          i +
          '" style="' +
          (i === primaryIdx ? "font-weight:700;border-color:#0F172A" : "") +
          '">' +
          esc(p.label) +
          "</button>";
      });
      pHtml += "</div>";
      pHtml += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px" class="no-print">';
      subs.forEach(function (s, j) {
        pHtml +=
          '<button type="button" class="pill dst" data-si="' +
          j +
          '" style="' +
          (j === subIdx ? "font-weight:700;border-color:#6366f1" : "") +
          '">' +
          esc(s.label) +
          "</button>";
      });
      pHtml += "</div>";

      VORDER.forEach(function (vid) {
        var v = VENDOR_BY_ID[vid];
        if (!v) return;
        var blk = blockForTab(v, tabId);
        var snips = (blk && blk.snippets) || [];
        var filtered = filterDrillSubSnips(snips, sub);
        pHtml +=
          '<div class="card" style="border-top:3px solid ' +
          esc(v.color) +
          '"><p style="font-weight:700;text-transform:uppercase;color:' +
          esc(v.color) +
          '">' +
          esc(v.displayName) +
          "</p>";
        if (vid === "ubiquity") {
          var qblocks = (v.drilldownSnippets || []).filter(function (b) {
            return b.tab.indexOf("Q: ") === 0;
          });
          if (qblocks.length) {
            pHtml +=
              '<p style="font-size:13px;color:#334155;margin:8px 0"><strong>Note:</strong> Ubiquity includes questionnaire-style blocks in addition to standard Appendix B tabs; excerpts below include both where available.</p>';
            qblocks.slice(0, 4).forEach(function (qb) {
              pHtml += "<p class='meta'>" + esc(qb.tab) + "</p>";
              (qb.snippets || []).slice(0, 8).forEach(function (sn) {
                var tx = sn.text || "";
                if (tx.length > 500) tx = tx.slice(0, 500) + "… [see full response in vendor workbook]";
                pHtml +=
                  "<p style='font-size:12px;color:#475569;margin:4px 0'>" +
                  esc(sn.questionText || "") +
                  "</p><p style='font-size:14px;white-space:pre-wrap;line-height:1.55'>" +
                  esc(tx) +
                  "</p>";
              });
            });
          }
        }
        if (!blk) {
          pHtml += "<p class='meta'>No extracted block for this tab.</p></div>";
          return;
        }
        pHtml += "<p class='meta'>" + esc(blk.tab) + "</p>";
        if (!filtered.length)
          pHtml += "<p class='meta'>No snippets match this sub-filter; try Summary.</p>";
        filtered.slice(0, 12).forEach(function (sn) {
          var tx = sn.text || "";
          if (tx.length > 500) tx = tx.slice(0, 500) + "… [see full response in vendor workbook]";
          pHtml +=
            "<p style='font-size:12px;color:#475569;margin:12px 0 4px'>" +
            esc(sn.questionText || "") +
            "</p><p style='font-size:14px;white-space:pre-wrap;line-height:1.55'>" +
            esc(tx) +
            "</p>";
        });
        pHtml += "</div>";
      });

      el.innerHTML = pHtml;
      el.querySelectorAll(".dpt").forEach(function (b) {
        b.addEventListener("click", function () {
          primaryIdx = +b.getAttribute("data-pi");
          subIdx = 0;
          paint();
        });
      });
      el.querySelectorAll(".dst").forEach(function (b) {
        b.addEventListener("click", function () {
          subIdx = +b.getAttribute("data-si");
          paint();
        });
      });
    }
    paint();
  };

  RENDERERS.scorecard = function (el) {
    var order = SC.columnOrder;
    var vendors = order.map(function (id) {
      return PORTFOLIO.vendors.find(function (v) {
        return v.id === id;
      });
    });
    var scoreSrc = SC.source || "Workshop 1 evaluator import.";
    var thead = "<tr><th class='data-table' style='text-align:left'>Dimension</th>";
    vendors.forEach(function (v) {
      if (!v) return;
      thead += "<th style='color:" + esc(v.color) + ";font-size:11px;min-width:72px'>" + esc(v.displayName) + "</th>";
    });
    thead += "</tr>";
    var body = "";
    var pillars = [];
    SC.dimensions.forEach(function (d) {
      if (pillars.indexOf(d.pillar) < 0) pillars.push(d.pillar);
    });
    pillars.forEach(function (pil) {
      body +=
        "<tr style='background:#F8FAFC'><td colspan='" +
        (order.length + 1) +
        "' style='font-weight:600;padding:10px 8px'>" +
        esc(String(pil).replace(/\(\d+%\)/, "").trim()) +
        "</td></tr>";
      SC.dimensions
        .filter(function (d) {
          return d.pillar === pil;
        })
        .forEach(function (d) {
          body += "<tr><td style='font-weight:500;text-align:left'>" + esc(d.label) + "</td>";
          order.forEach(function (id) {
            var scv = d.scores && d.scores[id];
            if (scv == null || typeof scv !== "number" || isNaN(scv)) {
              body +=
                "<td><span class='heat' style='background:#F8FAFC;color:#475569;border:1px dashed #CBD5E1'>—</span></td>";
            } else {
              var bg = heatColor19(scv);
              body +=
                "<td><span class='heat' style='background:" +
                bg +
                ";color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.25)'>" +
                scv.toFixed(1) +
                "</span></td>";
            }
          });
          body += "</tr>";
        });
    });
    body += "<tr style='background:#E2E8F0;font-weight:700'><td>Weighted composite</td>";
    order.forEach(function (id) {
      var c = SC.composite && SC.composite[id];
      body += "<td class='tabular-nums'>" + (c != null && !isNaN(c) ? c.toFixed(1) : "—") + "</td>";
    });
    body += "</tr>";

    var cards = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin:20px 0">';
    var sortedV = vendors
      .filter(Boolean)
      .slice()
      .sort(function (a, b) {
        return (b.composite ?? -999) - (a.composite ?? -999);
      });
    sortedV.forEach(function (v, idx) {
      cards +=
        '<div class="card" style="text-align:center;border-top:3px solid ' +
        esc(v.color) +
        '"><p style="font-size:13px;font-weight:700;color:' +
        esc(v.color) +
        '">' +
        esc(v.displayName) +
        '</p><p class="tabular-nums" style="font-size:22px;font-weight:700;margin:6px 0">' +
        (v.composite != null && !isNaN(v.composite) ? v.composite.toFixed(2) : "—") +
        "</p><p style='font-size:11px;color:#475569'>#" +
        (idx + 1) +
        " · composite</p></div>";
    });
    cards += "</div>";

    el.innerHTML =
      "<h1 class='p-title'>Ranking matrix (Scorecard)</h1><p class='p-sub'>Fifteen dimensions across six vendors. Weighted composite uses Partnership 10% and Commercial, Operational, Technology, and Migration each 22.5%.</p>" +
      '<p style="font-size:13px;color:#475569;max-width:48rem;border-left:2px solid #E2E8F0;padding-left:12px">' +
      esc(scoreSrc) +
      "</p>" +
      '<div class="card" style="margin:20px 0"><h2 style="margin:0 0 8px;font-size:15px;color:#0F172A">Scoring methodology</h2><p style="font-size:14px;color:#334155;line-height:1.55">Evaluators score each dimension on a 1–9 rubric. Workshop 1 imports populate cells; composites weight sub-scores by pillar. Use Evaluator scores for per-evaluator detail.</p></div>' +
      '<div class="card" style="background:#F8FAFC"><p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#475569">Score scale (1–9)</p><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:12px;color:#475569">' +
      [
        [1, "#dc2626", "Does not meet"],
        [3, "#e4620a", "Partially meets"],
        [7, "#579433", "Meets (strong)"],
        [9, "#14532d", "Exceeds"],
      ]
        .map(function (x) {
          return (
            '<span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:' +
            x[1] +
            ';vertical-align:middle;margin-right:6px"></span><strong class="tabular-nums">' +
            x[0] +
            "</strong> — " +
            esc(x[2]) +
            "</span>"
          );
        })
        .join("") +
      "</div></div>" +
      cards +
      '<div style="overflow-x:auto"><table class="data-table">' +
      thead +
      body +
      "</table></div>";
  };

  RENDERERS["scoring-dashboard"] = function (el) {
    var order = SC.columnOrder;
    var vendors = order
      .map(function (id) {
        return PORTFOLIO.vendors.find(function (v) {
          return v.id === id;
        });
      })
      .filter(Boolean);
    var scores = evalMerged.scores;
    var qual = evalMerged.qualitative;
    var qualV = order[0] || "cognizant";

    var compRows = vendors
      .map(function (v) {
        return { name: v.displayName, id: v.id, c: v.composite, color: v.color };
      })
      .sort(function (a, b) {
        return (b.c ?? -1) - (a.c ?? -1);
      });
    var compHtml = '<div class="card"><h2 style="margin:0 0 8px;font-size:17px">Weighted composite ranking</h2><p class="meta">1–9 composite; same weighting as scorecard.</p>';
    var maxC = 9;
    compRows.forEach(function (r) {
      var pct = r.c != null ? (r.c / maxC) * 100 : 0;
      compHtml +=
        '<div style="display:flex;align-items:center;gap:10px;margin:10px 0"><span style="width:100px;font-size:12px;font-weight:600;color:' +
        esc(r.color) +
        '">' +
        esc(r.name) +
        '</span><div class="bar-track"><div class="bar-fill" style="width:' +
        pct +
        "%;background:" +
        esc(r.color) +
        ';opacity:' +
        (r.c == null ? "0.25" : "0.9") +
        '"></div></div><span class="tabular-nums" style="width:48px">' +
        (r.c != null ? r.c.toFixed(2) : "—") +
        "</span></div>";
    });
    compHtml += "</div>";

    var pillarHtml = '<div class="card"><h2 style="margin:0 0 8px;font-size:17px">Pillar comparison (radar-scale 0–10)</h2><p class="meta">Mapped from 1–9 averages for chart readability.</p><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Vendor</th><th>Comm.</th><th>Ops.</th><th>Tech.</th><th>Mig.</th><th>Part.</th></tr></thead><tbody>';
    vendors.forEach(function (v) {
      var rv = (PORTFOLIO.radar && PORTFOLIO.radar.vendors && PORTFOLIO.radar.vendors.find(function (x) {
        return x.vendorId === v.id;
      })) || { pillars: {} };
      var p = rv.pillars || {};
      pillarHtml +=
        "<tr><td style='font-weight:600;color:" +
        esc(v.color) +
        "'>" +
        esc(v.displayName) +
        "</td>" +
        "<td class='tabular-nums'>" +
        (p.commercial != null ? p.commercial.toFixed(2) : "—") +
        "</td>" +
        "<td class='tabular-nums'>" +
        (p.operations != null ? p.operations.toFixed(2) : "—") +
        "</td>" +
        "<td class='tabular-nums'>" +
        (p.technology != null ? p.technology.toFixed(2) : "—") +
        "</td>" +
        "<td class='tabular-nums'>" +
        (p.migration != null ? p.migration.toFixed(2) : "—") +
        "</td>" +
        "<td class='tabular-nums'>" +
        (p.partnership != null ? p.partnership.toFixed(2) : "—") +
        "</td></tr>";
    });
    pillarHtml += "</tbody></table></div></div>";

    var heatHead =
      "<tr><th style='text-align:left'>Sub-dimension</th>" +
      vendors
        .map(function (v) {
          return "<th style='color:" + esc(v.color) + "'>" + esc(v.displayName) + "</th>";
        })
        .join("") +
      "</tr>";
    var heatBody = "";
    FLAT.forEach(function (sub) {
      heatBody += "<tr><td style='text-align:left;font-size:12px'><strong>" + esc(sub.id) + "</strong> " + esc(sub.label) + "</td>";
      vendors.forEach(function (v) {
        var vals = EVALUATOR_IDS.map(function (eid) {
          return scores[v.id] && scores[v.id][eid] && scores[v.id][eid][sub.id];
        }).filter(function (x) {
          return x != null && typeof x === "number";
        });
        var m = vals.length ? mean(vals) : null;
        if (m == null) heatBody += "<td>—</td>";
        else {
          var bg = heatColor19(m);
          heatBody +=
            "<td><span class='heat' style='background:" +
            bg +
            ";color:#fff'>" +
            m.toFixed(2) +
            "</span></td>";
        }
      });
      heatBody += "</tr>";
    });

    var themes = themeCounts(qual, qualV, 14);
    var themeHtml =
      '<div class="card"><h2 style="margin:0 0 8px;font-size:17px">Qualitative themes (Workshop 1 text)</h2><p class="meta">Token frequency from Q3–Q7 responses — vendor: <select id="sd-qual-v" class="no-print">';
    order.forEach(function (id) {
      var v = PORTFOLIO.vendors.find(function (x) {
        return x.id === id;
      });
      themeHtml +=
        '<option value="' +
        esc(id) +
        '"' +
        (id === qualV ? " selected" : "") +
        ">" +
        esc(v.displayName) +
        "</option>";
    });
    themeHtml += "</select></p><div id='sd-themes' style='display:flex;flex-wrap:wrap;gap:8px;margin-top:12px'>";
    themes.forEach(function (t) {
      themeHtml +=
        '<span style="font-size:12px;padding:4px 10px;border-radius:999px;background:#F1F5F9;border:1px solid #E2E8F0">' +
        esc(t.term) +
        " · " +
        t.count +
        "</span>";
    });
    themeHtml += "</div><p style='margin-top:16px;font-size:13px'><a href='#scorecard' style='color:#1E40AF;font-weight:600'>Open Scorecard</a> for methodology.</p></div>";

    el.innerHTML =
      "<h1 class='p-title'>Scoring dashboard</h1><p class='p-sub'>Pillar-level patterns, sub-dimension heat (evaluator averages), and qualitative themes.</p>" +
      (evalMerged.importNote
        ? '<p style="font-size:12px;color:#475569;border-left:2px solid #CBD5E1;padding-left:10px">' +
          esc(evalMerged.importNote) +
          "</p>"
        : "") +
      '<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">' +
      compHtml +
      pillarHtml +
      "</div>" +
      '<div class="card" style="margin-top:16px;overflow-x:auto"><h2 style="margin:0 0 8px;font-size:17px">Sub-dimension heat (mean of evaluators)</h2><table class="data-table">' +
      heatHead +
      heatBody +
      "</table></div>" +
      themeHtml;

    var sel = el.querySelector("#sd-qual-v");
    if (sel) {
      sel.addEventListener("change", function () {
        qualV = sel.value;
        var th = themeCounts(qual, qualV, 14);
        var box = el.querySelector("#sd-themes");
        box.innerHTML = th
          .map(function (t) {
            return (
              '<span style="font-size:12px;padding:4px 10px;border-radius:999px;background:#F1F5F9;border:1px solid #E2E8F0">' +
              esc(t.term) +
              " · " +
              t.count +
              "</span>"
            );
          })
          .join("");
      });
    }
  };

  RENDERERS["evaluator-scores"] = function (el) {
    var order = SC.columnOrder;
    var scores = evalMerged.scores;
    var importNote = evalMerged.importNote;
    var highDiv = [];
    order.forEach(function (vid) {
      FLAT.forEach(function (r) {
        var vals = EVALUATOR_IDS.map(function (eid) {
          return scores[vid] && scores[vid][eid] && scores[vid][eid][r.id];
        }).filter(function (x) {
          return x != null && typeof x === "number";
        });
        var sd = stdevSample(vals);
        if (sd != null && sd > 2) highDiv.push({ vendorId: vid, subId: r.id, sd: sd, label: r.label });
      });
    });

    var vendorTab = order[0] || "cognizant";
    function paintEv() {
      var thead =
        "<tr><th style='text-align:left;width:240px'>Dimension</th>" +
        EVALUATOR_IDS.map(function (_, j) {
          return "<th style='min-width:46px;font-size:10px'>E" + (j + 1) + "</th>";
        }).join("") +
        "</tr>";
      var body = "";
      FLAT.forEach(function (d) {
        body +=
          "<tr><td style='text-align:left'><strong class='tabular-nums'>" +
          esc(d.id) +
          "</strong><br><span style='font-size:11px;color:#475569'>" +
          esc(d.label) +
          "</span></td>";
        EVALUATOR_IDS.forEach(function (eid) {
          var x = scores[vendorTab] && scores[vendorTab][eid] && scores[vendorTab][eid][d.id];
          if (x == null || typeof x !== "number" || isNaN(x)) body += "<td><div class='ev-blank'></div></td>";
          else {
            var bg = heatColor19(x);
            body +=
              "<td><span class='heat' style='background:" +
              bg +
              ";color:#fff'>" +
              Number(x).toFixed(1) +
              "</span></td>";
          }
        });
        body += "</tr>";
      });
      var divNote =
        highDiv.length > 0
          ? '<div class="warn"><strong>Divergence flags</strong> (sample stdev &gt; 2 across evaluators on a sub-dimension): ' +
            highDiv
              .slice(0, 12)
              .map(function (h) {
                return esc(order.find(function (id) {
                  return id === h.vendorId;
                }) || h.vendorId) +
                  " · " +
                  esc(h.subId) +
                  " (" +
                  h.sd.toFixed(2) +
                  ")";
              })
              .join(" · ") +
            "</div>"
          : "";

      el.innerHTML =
        "<h1 class='p-title'>Evaluator scores</h1><p class='p-sub'>Workshop 1 matrix (scale 1–9). Columns E1–E12 are evaluator slots.</p>" +
        (importNote ? '<p class="meta">' + esc(importNote) + "</p>" : "") +
        '<p style="font-size:13px;color:#475569">Target note from program timeline: ' +
        esc(D.evaluatorScoresTargetLine || "") +
        "</p>" +
        divNote +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0" class="no-print">' +
        order
          .map(function (id, i) {
            var v = PORTFOLIO.vendors.find(function (x) {
              return x.id === id;
            });
            var c = v ? v.color : "#64748b";
            return (
              '<button type="button" class="pill evp" data-vid="' +
              esc(id) +
              '" style="' +
              (id === vendorTab ? "border-color:" + c + ";color:" + c + ";background:" + c + "1A;font-weight:700" : "") +
              '">' +
              esc(v.displayName) +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="card" style="overflow-x:auto"><table class="data-table">' +
        thead +
        body +
        "</table></div>" +
        "<p class='meta'>Source: evaluator import bundled with this file (no external folder references).</p>";

      el.querySelectorAll(".evp").forEach(function (b) {
        b.addEventListener("click", function () {
          vendorTab = b.getAttribute("data-vid");
          paintEv();
        });
      });
    }
    paintEv();
  };

  RENDERERS.feedback = function (el) {
    var order = SC.columnOrder;
    var qual = evalMerged.qualitative;
    var conf = evalMerged.confidence;
    var proc = evalMerged.proceed;
    var vtab = order[0] || "cognizant";
    var qtab = "Q3";

    function paintFb() {
      var pills = order
        .map(function (id) {
          var v = PORTFOLIO.vendors.find(function (x) {
            return x.id === id;
          });
          var c = v ? v.color : "#64748b";
          return (
            '<button type="button" class="pill fbp" data-v="' +
            esc(id) +
            '" style="' +
            (id === vtab ? "border-color:" + c + ";color:" + c + ";background:" + c + "1A;font-weight:700" : "") +
            '">' +
            esc(v.displayName) +
            "</button>"
          );
        })
        .join("");
      var qpills = ["Q3", "Q4", "Q5", "Q6", "Q7"]
        .map(function (q) {
          return (
            '<button type="button" class="pill fbq" data-q="' +
            q +
            '" style="' +
            (q === qtab ? "font-weight:700;border-color:#0F172A" : "") +
            '">' +
            esc(q) +
            "</button>"
          );
        })
        .join("");

      var block =
        '<h2 style="font-size:16px;margin:20px 0 8px">' +
        esc(QUAL_Q[qtab] || qtab) +
        "</h2>";
      EVALUATOR_IDS.forEach(function (eid, j) {
        var txt =
          (qual[vtab] && qual[vtab][eid] && qual[vtab][eid][qtab] && String(qual[vtab][eid][qtab]).trim()) || "";
        if (!txt) return;
        block +=
          '<div class="card" style="padding:12px 14px;margin-bottom:10px"><p class="meta">Evaluator ' +
          (j + 1) +
          "</p><p style='font-size:14px;line-height:1.55;white-space:pre-wrap;color:#334155'>" +
          esc(txt) +
          "</p></div>";
      });

      var confRows = "";
      EVALUATOR_IDS.forEach(function (eid, j) {
        var val = conf[vtab] && conf[vtab][eid];
        confRows +=
          "<tr><td>E" +
          (j + 1) +
          "</td><td>" +
          esc(val || "—") +
          "</td></tr>";
      });
      var procRows = "";
      EVALUATOR_IDS.forEach(function (eid, j) {
        var val = proc[vtab] && proc[vtab][eid];
        var s = val === true ? "Proceed" : val === false ? "Do not proceed" : "—";
        procRows += "<tr><td>E" + (j + 1) + "</td><td>" + esc(s) + "</td></tr>";
      });

      el.innerHTML =
        "<h1 class='p-title'>Feedback</h1><p class='p-sub'>Qualitative Workshop 1 responses (Q3–Q7), confidence, and proceed / do not proceed.</p>" +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">' +
        pills +
        "</div>" +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">' +
        qpills +
        "</div>" +
        block +
        '<h2 style="font-size:16px;margin:28px 0 8px">Confidence</h2><div class="card" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Evaluator</th><th>Level</th></tr></thead><tbody>' +
        confRows +
        "</tbody></table></div>" +
        '<h2 style="font-size:16px;margin:28px 0 8px">Proceed / don&apos;t proceed</h2><div class="card" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Evaluator</th><th>Vote</th></tr></thead><tbody>' +
        procRows +
        "</tbody></table></div>";

      el.querySelectorAll(".fbp").forEach(function (b) {
        b.addEventListener("click", function () {
          vtab = b.getAttribute("data-v");
          paintFb();
        });
      });
      el.querySelectorAll(".fbq").forEach(function (b) {
        b.addEventListener("click", function () {
          qtab = b.getAttribute("data-q");
          paintFb();
        });
      });
    }
    paintFb();
  };

  RENDERERS["ideal-rfp-submission"] = function (el) {
    var pack = D.idealRfpSubmission;
    if (!pack || !pack.criteria || !pack.criteria.length) {
      el.innerHTML =
        "<h1 class='p-title'>Ideal RFP submission</h1><div class='warn'>No idealRfpSubmission.json in bundle.</div>";
      return;
    }
    var meta = pack.meta || {};
    var h =
      "<h1 class='p-title'>" +
      esc(meta.documentTitle || "Ideal RFP submission") +
      "</h1><p class='p-sub'>" +
      esc(meta.subtitle || "") +
      "</p>";
    if (meta.purpose) h += '<div class="card"><p style="font-size:14px;line-height:1.6">' + esc(meta.purpose) + "</p></div>";
    (pack.criteria || []).forEach(function (crit) {
      h +=
        '<div class="card" style="margin-top:16px;border-left:4px solid #059669"><h2 style="margin:0 0 8px;font-size:17px;color:#0F172A">' +
        esc(String(crit.num) + ". " + crit.title) +
        "</h2>";
      (crit.subsections || []).forEach(function (sub) {
        h +=
          '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #E2E8F0"><h3 style="margin:0 0 6px;font-size:15px">' +
          esc(sub.title) +
          "</h3>";
        if (sub.intro) h += "<p style='font-size:14px;color:#334155'>" + esc(sub.intro) + "</p>";
        if ((sub.signals || []).length) {
          h +=
            '<p style="font-size:11px;font-weight:600;color:#059669;margin:12px 0 4px">Signals of a strong submission</p><ul style="margin:0;padding-left:20px;line-height:1.55;font-size:13px">';
          sub.signals.forEach(function (s) {
            h += "<li>" + esc(s) + "</li>";
          });
          h += "</ul>";
        }
        if ((sub.logicChecks || []).length) {
          h +=
            '<p style="font-size:11px;font-weight:600;color:#2563EB;margin:12px 0 4px">If / then checks</p><ul style="list-style:none;padding:0;margin:0;font-size:13px">';
          sub.logicChecks.forEach(function (lc) {
            h +=
              "<li style='margin-bottom:8px'><em>If</em> " +
              esc(lc.if || "") +
              " <em>then</em> " +
              esc(lc.then || "") +
              "</li>";
          });
          h += "</ul>";
        }
        if ((sub.redFlags || []).length) {
          h +=
            '<p style="font-size:11px;font-weight:600;color:#B91C1C;margin:12px 0 4px">Red flags</p><ul style="margin:0;padding-left:20px;line-height:1.55;font-size:13px">';
          sub.redFlags.forEach(function (r) {
            h += "<li>" + esc(r) + "</li>";
          });
          h += "</ul>";
        }
        h += "</div>";
      });
      h += "</div>";
    });
    el.innerHTML = h;
  };

  RENDERERS["vendor-submissions"] = function (el) {
    var h =
      "<h1 class='p-title'>Vendor submissions</h1><p class='p-sub'>Original PDFs, workbooks, and SOW redlines are not embedded in this single file.</p>" +
      '<div class="warn"><strong>Original files</strong> are available on the project SharePoint / shared drive (or regenerate the vendor-files bundle in the repo). Below is the manifest listing from the last export.</div>';
    VORDER.forEach(function (vid) {
      var entry = MANIFEST.vendors && MANIFEST.vendors[vid];
      var v = PORTFOLIO.vendors.find(function (x) {
        return x.id === vid;
      });
      if (!entry) return;
      h +=
        '<div class="card" style="border-top:3px solid ' +
        esc((v && v.color) || "#64748b") +
        '"><p style="font-weight:700;color:' +
        esc((v && v.color) || "#64748b") +
        '">' +
        esc((v && v.displayName) || vid) +
        "</p><ul style='margin:8px 0;padding-left:18px;line-height:1.6;font-size:14px;color:#334155'>";
      function one(doc, label) {
        if (!doc || doc.missing) return;
        var ext = (doc.fileName && doc.fileName.split(".").pop()) || doc.kind || "";
        h +=
          "<li><strong>" +
          esc(label) +
          ":</strong> " +
          esc(doc.fileName || doc.label || "") +
          " · " +
          esc(String(ext).toUpperCase()) +
          " · " +
          formatBytes(doc.bytes) +
          "</li>";
      }
      one(entry.proposal, "Proposal");
      one(entry.workbook, "Workbook");
      one(entry.sow, "SOW Redline");
      (entry.supplemental || []).forEach(function (s, i) {
        one(s, s.label || "Supplemental " + (i + 1));
      });
      h += "</ul></div>";
    });
    h +=
      "<p class='meta'>Paths in manifest (e.g. /vendor-files/...) refer to the project static folder, not this HTML file.</p>";
    el.innerHTML = h;
  };

  RENDERERS.admin = function (el) {
    var rows = "";
    VORDER.forEach(function (id) {
      var v = VENDOR_BY_ID[id];
      if (!v || !v.adminTabs) return;
      v.adminTabs.forEach(function (t) {
        var st = (t.status || "").toLowerCase();
        var mark = st.indexOf("complete") >= 0 ? "✓" : st.indexOf("partial") >= 0 ? "◐" : "✗";
        rows +=
          "<tr><td style='font-weight:600;color:" +
          esc(v.color) +
          "'>" +
          esc(v.displayName) +
          "</td><td>" +
          esc(t.tab) +
          "</td><td>" +
          esc(mark + " " + (t.status || "")) +
          "</td></tr>";
      });
    });
    el.innerHTML =
      "<h1 class='p-title'>Admin checklist</h1><p class='p-sub'>Workbook tab coverage from extraction (per vendor).</p>" +
      '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Vendor</th><th>Tab</th><th>Status</th></tr></thead><tbody>' +
      rows +
      "</tbody></table></div>";
  };

  RENDERERS["provide-feedback"] = function (el) {
    el.innerHTML =
      "<h1 class='p-title'>Your feedback</h1><p class='p-sub'>Capture notes for the program team. Nothing is saved to disk — use copy to paste into email or Teams.</p>" +
      '<textarea id="fb-notes" class="card" style="width:100%;min-height:160px;font-family:inherit;font-size:14px;padding:14px" placeholder="Type feedback, issues, or change requests…"></textarea>' +
      '<p style="margin-top:12px"><button type="button" class="pill no-print" id="fb-copy" style="font-weight:600;border-color:#0F172A">Copy to clipboard</button> <span id="fb-copy-msg" class="meta"></span></p>';
    var btn = el.querySelector("#fb-copy");
    var ta = el.querySelector("#fb-notes");
    var msg = el.querySelector("#fb-copy-msg");
    btn.addEventListener("click", function () {
      var t = ta.value || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () {
          msg.textContent = "Copied.";
        });
      } else {
        ta.select();
        document.execCommand("copy");
        msg.textContent = "Copied.";
      }
    });
  };

  buildNav();
  function onHash() {
    var h = normalizeHash();
    setActiveSection(h);
    lazyRender(h);
  }
  window.addEventListener("hashchange", onHash);
  if (!location.hash) location.hash = "#overview";
  onHash();
})();
