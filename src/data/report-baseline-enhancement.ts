import type { ReportBaselineContext } from './report-baseline-context'

// The four report prototypes are self-contained HTML documents. Append one shared
// enhancement so their saved visual layouts remain intact while the live baseline
// event controls the displayed metric scope and comparisons.
export function enhanceReportHtml(html: string, context: ReportBaselineContext | null): string {
  if (!context)
    return html
  const payload = JSON.stringify(context).replaceAll('<', '\\u003c')
  const script = `<script>
  (() => {
    const baseline = ${payload};
    const rate = (value) => value == null ? '—' : value + '%';
    const names = ['soa', 'recommendation', 'citation', 'sov'];
    document.querySelectorAll('.metric-cell').forEach((cell, index) => {
      if (!names[index]) return;
      cell.querySelector('.metric-value').textContent = rate(baseline.rates[names[index]]);
      const affected = baseline.crossBaseline[names[index]];
      const delta = cell.querySelector('.metric-delta'); if (delta) delta.textContent = affected ? '新基线' : '—';
      const compare = cell.querySelector('.metric-compare'); if (compare) compare.textContent = affected ? '跨基线不计算环比' : '本期未提供可比值';
      const note = cell.querySelector('.metric-note'); if (note) note.textContent = '按新基线生效后的有效回答统计';
    });
    const notice = document.createElement('div');
    notice.className = 'baseline-report-notice';
    notice.textContent = '第' + baseline.roundNo + '轮（' + baseline.date + '）起更新' + baseline.reason + '基线。当前 SOA 按适用口径汇总本期 ' + baseline.validAnswers + ' 条有效回答；历史轮次保留，受影响指标跨基线不计算环比。';
    const metrics = document.getElementById('metrics-content');
    if (metrics) metrics.prepend(notice);
    const firstComparison = metrics && metrics.querySelector('.aux-grid .aux-item small');
    if (firstComparison) firstComparison.textContent = '当前基线轮次结果';
    const summary = document.getElementById('summary-content');
    if (summary) summary.innerHTML = '<div class="summary-band"><p class="summary-lead">' + (baseline.changedInPeriod ? '本期发生基线变更' : '当前基线下的表现') + '</p><p class="summary-copy">当前品牌提及率（SOA）为 <strong>' + rate(baseline.rates.soa) + '</strong>，按适用口径的有效回答汇总。历史结果仍可查看；受影响指标跨基线的环比暂不展示。</p></div>';
    const analysis = document.getElementById('analysis-content');
    if (analysis) analysis.innerHTML = '<div class="analysis-grid"><article class="analysis-card is-primary"><h3>新基线已生效</h3><p>第' + baseline.roundNo + '轮起使用更新后的配置。本期指标只统计新基线轮次，旧轮次继续留在趋势中供回看。</p></article></div>';
    if (baseline.crossBaseline.soa) {
      const questionTable = document.querySelector('#questions-content table');
      if (questionTable) {
        const headers = [...questionTable.querySelectorAll('thead th')];
        const comparisonIndex = headers.findIndex(header => header.textContent.includes('较上期'));
        if (comparisonIndex >= 0) {
          headers[comparisonIndex].textContent = '跨基线对比';
          questionTable.querySelectorAll('tbody tr').forEach(row => {
            const cell = row.children[comparisonIndex];
            if (cell) cell.textContent = '—';
          });
        }
      }
    }
    const chart = document.querySelector('#trends-content .chart-shell');
    if (chart) {
      const rows = baseline.trend.filter(item => item.soa != null);
      const width = 720, height = 190, left = 35, right = 25, top = 15, bottom = 35;
      const x = (index) => left + index * (width-left-right) / Math.max(1, rows.length-1);
      const y = (value) => top + (100-value) * (height-top-bottom) / 100;
      const line = rows.map((item, index) => x(index) + ',' + y(item.soa)).join(' ');
      const marker = rows.map((item, index) => item.baseline ? '<line x1="' + x(index) + '" y1="8" x2="' + x(index) + '" y2="' + (height-bottom) + '" stroke="#ff4d4f" stroke-width="4"/><text x="' + Math.min(x(index)+8,width-115) + '" y="34" fill="#ff4d4f" font-size="15" font-weight="700">基线变化</text>' : '').join('');
      chart.innerHTML = '<strong>品牌提及率趋势</strong><div class="chart-stage"><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="历史轮次品牌提及率；虚线标记基线更新">' + marker + '<polyline points="' + line + '" fill="none" stroke="#2563eb" stroke-width="3"/>' + rows.map((item,index) => '<circle cx="' + x(index) + '" cy="' + y(item.soa) + '" r="4" fill="#2563eb"><title>第' + item.roundNo + '轮 ' + item.soa + '%</title></circle>').join('') + '</svg></div><div class="chart-x-axis">' + rows.map(item => '<span>' + item.date.slice(5) + '</span>').join('') + '</div>';
    }
    const style = document.createElement('style');
    style.textContent = '.baseline-report-notice{padding:12px 16px;margin-bottom:14px;border:1px solid #f6d49a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:13px;line-height:1.6}';
    document.head.appendChild(style);
  })();
  <\/script>`
  return html.replace('</body>', `${script}</body>`)
}
