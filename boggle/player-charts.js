/* Games-per-player views. Counts include completed games from real players only. */
(function(root) {
  "use strict";
  function summarize(players) {
    var rows = players.filter(function(p) { return !(p.fullData && p.fullData.isTest); }).map(function(p) {
      return { name: p.player, games: ((p.fullData && p.fullData.sessions) || []).filter(function(s) { return !s.early; }).length };
    }).sort(function(a, b) { return b.games - a.games || a.name.localeCompare(b.name); });
    var bounds = [[0,0],[1,1],[2,2],[3,5],[6,10],[11,20],[21,50],[51,100],[101,Infinity]];
    return { rows: rows, max: Math.max.apply(null, rows.map(function(p) { return p.games; }).concat([0])), buckets: bounds.map(function(b) {
      return { label: b[1] === Infinity ? "101+" : b[0] === b[1] ? String(b[0]) : b[0] + "–" + b[1], players: rows.filter(function(p) { return p.games >= b[0] && p.games <= b[1]; }) };
    }) };
  }
  function atLeast(rows, threshold) { return rows.filter(function(p) { return p.games >= threshold; }).length; }
  function render(container, players) {
    var data = summarize(players), rows = data.rows, max = Math.max(1, data.max);
    var ns = "http://www.w3.org/2000/svg";
    function html(tag, cls, text, parent) {
      var e = document.createElement(tag); e.className = cls || "";
      if (text !== undefined) e.textContent = text;
      if (parent) parent.appendChild(e);
      return e;
    }
    function svg(tag, attrs, parent, text) {
      var e = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function(k) { e.setAttribute(k, attrs[k]); });
      if (text !== undefined) e.textContent = text;
      parent.appendChild(e); return e;
    }
    function card(title, subtitle) {
      var box = html("div", "chart-card player-chart", undefined, container);
      html("div", "eyebrow", title, box);
      html("p", "player-chart-note", subtitle, box);
      var body = html("div", "player-chart-body", undefined, box);
      var hint = "Hover, tap, or focus a mark for details.";
      var detail = html("div", "player-chart-detail", hint, box);
      function inspect(mark, description) {
        mark.setAttribute("tabindex", "0");
        mark.setAttribute("aria-label", description);
        ["pointerenter", "focus", "click"].forEach(function(event) {
          mark.addEventListener(event, function() { detail.textContent = description; });
        });
        if (mark.namespaceURI === ns) svg("title", {}, mark, description);
        else mark.title = description;
      }
      if (!rows.length) { body.textContent = "No player data yet."; detail.textContent = ""; }
      return {body: body, inspect: inspect};
    }
    function chart(c, height) {
      return svg("svg", {viewBox: "0 0 420 " + height, width: "100%", "aria-label": c.body.parentElement.querySelector(".eyebrow").textContent}, c.body);
    }
    function line(s, x1, y1, x2, y2, color) { return svg("line", {x1:x1,y1:y1,x2:x2,y2:y2,stroke:color || "var(--line)"},s); }
    function label(s, x, y, text, anchor) { return svg("text", {x:x,y:y,fill:"var(--sage)","font-size":10,"text-anchor":anchor || "middle"},s,text); }
    function yAxis(s, top, bottom, total) {
      var seen = {};
      for (var i=0;i<=4;i++) {
        var count = Math.round(total*i/4); if (seen[count]) continue; seen[count]=true;
        var y=bottom-count/Math.max(1,total)*(bottom-top);
        line(s,36,y,404,y); label(s,30,y+3,count,"end");
      }
      label(s,36,12,"Players","start");
    }
    function logX(n) { return 36 + Math.log1p(n)/Math.log1p(max)*368; }
    function logAxis(s, y) {
      var ticks = [0];
      for (var power=1;power<=max;power*=10) [1,2,5].forEach(function(m) { if(power*m<=max) ticks.push(power*m); });
      var last = -Infinity;
      ticks.forEach(function(n) { var x=logX(n); if(x-last<32 || (n!==max && logX(max)-x<32)) return; label(s,x,y+16,n); last=x; });
      if (ticks.indexOf(max) === -1) label(s,logX(max),y+16,max);
      label(s,220,y+36,"Completed games · logarithmic spacing");
    }
    var hist = card("Games per player · buckets", "Wider ranges reveal regular and heavy players. X: completed games; Y: players.");
    if (rows.length) {
      var h = chart(hist,230), peak = Math.max.apply(null,data.buckets.map(function(b) { return b.players.length; }).concat([1]));
      yAxis(h,28,174,peak);
      data.buckets.forEach(function(b,i) {
        var x=36+i*41, height=b.players.length/peak*146;
        var group=svg("g",{},h);
        svg("rect",{x:x+5,y:174-height,width:28,height:Math.max(height,1),rx:3,fill:"var(--amber)"},group);
        label(group,x+19,166-height,b.players.length);
        svg("text",{transform:"translate("+(x+20)+",190) rotate(-35)",fill:"var(--sage)","font-size":10,"text-anchor":"end"},group,b.label);
        hist.inspect(group,b.label+" games: "+b.players.length+" players"+(b.players.length ? " — "+b.players.map(function(p) { return p.name+": "+p.games; }).join(", ") : ""));
      });
    }
    var dots = card("Games per player · individual dots", "One dot per player. Stacked dots separate similar counts; position gives the exact game count.");
    if (rows.length) {
      var lanes=[], points=rows.slice().reverse().map(function(p) {
        var x=logX(p.games), lane=0;
        while(lane<lanes.length && x-lanes[lane]<12) lane++;
        lanes[lane]=x; return {p:p,x:x,lane:lane};
      });
      var base=Math.max(120,lanes.length*12+24), d=chart(dots,base+48);
      dots.body.style.maxHeight="300px"; dots.body.style.overflow="auto";
      line(d,36,base,404,base); logAxis(d,base);
      points.forEach(function(pt) {
        var dot=svg("circle",{cx:pt.x,cy:base-8-pt.lane*12,r:4.5,fill:"var(--amber)"},d);
        dots.inspect(dot,pt.p.name+": "+pt.p.games+" completed games");
      });
    }
    var ranked = card("Games per player · ranked", "Every player, most games first. Bar lengths use a linear scale; scroll to see everyone.");
    if (rows.length) {
      ranked.body.classList.add("player-ranking");
      rows.forEach(function(p,i) {
        var row=html("div","player-rank-row",undefined,ranked.body);
        html("span","player-rank-name",(i+1)+". "+p.name,row);
        var track=html("span","player-rank-track",undefined,row);
        var fill=html("span","player-rank-fill",undefined,track); fill.style.width=(p.games/max*100)+"%";
        html("span","player-rank-count",String(p.games),row);
        ranked.inspect(row,p.name+": "+p.games+" completed games");
      });
    }
    var reach = card("Players with at least X games", "How many players reach each game count. Includes zero-game players; this shows lifetime activity, not retention over time.");
    if (rows.length) {
      var s=chart(reach,230); yAxis(s,28,174,rows.length); logAxis(s,174);
      function y(count) { return 174-count/rows.length*146; }
      var unique=Array.from(new Set(rows.map(function(p) { return p.games; }))).sort(function(a,b) { return a-b; });
      var path="M36,"+y(rows.length), remaining=rows.length;
      unique.forEach(function(n) {
        path+=" H"+logX(n);
        remaining-=rows.filter(function(p) { return p.games===n; }).length;
        if(n<data.max) path+=" V"+y(remaining);
      });
      svg("path",{d:path,fill:"none",stroke:"var(--amber)","stroke-width":2},s);
      Array.from(new Set([0,1,5,10,20,50,100,data.max].concat(unique))).filter(function(n) { return n<=data.max; }).sort(function(a,b) { return a-b; }).forEach(function(n) {
        var count=atLeast(rows,n);
        var point=svg("circle",{cx:logX(n),cy:y(count),r:3.5,fill:"var(--amber)"},s);
        reach.inspect(point,"At least "+n+" games: "+count+" of "+rows.length+" players ("+Math.round(count/rows.length*100)+"%)");
      });
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = {summarize:summarize,atLeast:atLeast};
  else root.renderPlayerGameCharts = render;
})(typeof window !== "undefined" ? window : globalThis);
