const endpoint = '/api/dsgarage/work';
const post = async value => {
  const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(value)});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || '制作状況を更新できません。');
  return data;
};

export const startWork = (stage, detail) => post({action: 'start', stage, detail});
export const updateWork = (id, detail) => post({action: 'update', id, detail});
export const finishWork = (id, detail, failed = false) => post({action: failed ? 'fail' : 'finish', id, detail});

const panel = document.createElement('section');
panel.id = 'dsgarageWorkPanel';
panel.setAttribute('aria-label', '現在の制作作業');
panel.innerHTML = '<h2></h2><div id="dsgarageWorkList" role="status" aria-live="polite"></div>';
const style = document.createElement('style');
style.textContent = '#dsgarageWorkPanel{margin:10px 24px;width:calc(100% - 48px);max-width:1040px;padding:12px 16px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--ink)}#dsgarageWorkPanel h2{margin:0 0 8px;font-size:15px}#dsgarageWorkList{display:grid;gap:9px}.dsgarage-work{padding:8px 0;border-top:1px solid var(--line)}.dsgarage-work:first-child{border:0}.dsgarage-work strong{display:block}.dsgarage-work small{display:block;color:var(--muted);margin-top:3px}.dsgarage-work details{margin-top:5px}.dsgarage-work.failed strong{color:#e6847f}.dsgarage-work.pending strong{color:var(--warning)}';
document.head.append(style);
document.querySelector('#pageTitle')?.closest('.page-topbar')?.after(panel);
let previous = '';
const labels = {
  ja: {heading: '現在の制作作業', empty: '連携した作業はありません。', running: '実行中', complete: '処理終了', failed: '失敗', pending: '更新待ち（実行状態は未確認）', history: '作業履歴', error: '制作状況を取得できません。'},
  en: {heading: 'Current production work', empty: 'No connected work yet.', running: 'Running', complete: 'Finished', failed: 'Failed', pending: 'No recent update; execution status unknown', history: 'Recent steps', error: 'Could not load production status.'},
  ko: {heading: '현재 제작 작업', empty: '연결된 작업이 없습니다.', running: '진행 중', complete: '처리 종료', failed: '실패', pending: '업데이트 대기 (실행 상태 미확인)', history: '작업 기록', error: '작업 상태를 가져올 수 없습니다.'},
  'zh-CN': {heading: '当前制作任务', empty: '尚无已连接的任务。', running: '进行中', complete: '处理结束', failed: '失败', pending: '等待更新（执行状态未确认）', history: '最近步骤', error: '无法获取任务状态。'}
};
function render(state) {
  const locale = document.querySelector('#languageSelect')?.value || 'en', t = labels[locale] || labels.en;
  panel.setAttribute('aria-label', t.heading);
  panel.querySelector('h2').textContent = t.heading;
  const list = panel.querySelector('#dsgarageWorkList');
  list.replaceChildren();
  if (!state.jobs.length) {list.textContent = t.empty; return;}
  for (const job of state.jobs.slice(0, 5)) {
    const age = Date.now() - Date.parse(job.updatedAt), pending = job.state === 'running' && age > 30000;
    const card = document.createElement('div');card.className = `dsgarage-work ${pending ? 'pending' : job.state}`;
    const heading = document.createElement('strong');heading.textContent = `${job.stage} · ${pending ? t.pending : t[job.state]}`;card.append(heading);
    const detail = document.createElement('div');detail.textContent = job.detail;card.append(detail);
    const stamp = document.createElement('small');stamp.textContent = `${new Date(job.startedAt).toLocaleString()} → ${new Date(job.updatedAt).toLocaleString()}`;card.append(stamp);
    if (job.history.length > 1) {
      const history = document.createElement('details'), summary = document.createElement('summary');summary.textContent = t.history;history.append(summary);
      const ol = document.createElement('ol');for (const step of job.history) {const li = document.createElement('li');li.textContent = `${new Date(step.at).toLocaleTimeString()} ${step.detail}`;ol.append(li);}history.append(ol);card.append(history);
    }
    list.append(card);
  }
}
async function poll() {
  try {
    const response = await fetch(endpoint, {cache: 'no-store'});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const state = await response.json(), serialized = JSON.stringify(state);
    if (serialized !== previous || state.jobs?.some(job => job.state === 'running')) {previous = serialized;render(state);}
  } catch {panel.querySelector('#dsgarageWorkList').textContent = (labels[document.querySelector('#languageSelect')?.value] || labels.en).error;}
}
poll();setInterval(poll, 3000);
