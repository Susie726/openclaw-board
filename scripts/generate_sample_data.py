#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'sample-data.json'
LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone.utc
STOPWORDS = {
    'the','a','an','and','or','but','for','with','from','into','onto','about','over','under','after','before','during','while',
    'this','that','these','those','there','here','then','than','have','has','had','will','would','could','should','can','cant',
    'you','your','yours','me','my','mine','we','our','ours','they','their','them','he','she','his','her','hers','its','it',
    'what','when','where','why','how','who','whom','which','also','just','like','more','less','much','many','some','any','all',
    'not','dont','didnt','doesnt','isnt','arent','wasnt','werent','been','being','are','is','am','was','were','be','to','of',
    'in','on','at','by','as','if','so','do','did','does','done','via','per','than','too','very','please','thanks','thank',
    'openclaw','json','user','assistant','system','message','messages','session','sessions','today','week','month','last','current',
    'file','text','wheel','root','keep','apr','gmt','reply','current',
    '一个','这个','那个','你','我','我们','他们','然后','就是','可以','需要','一下','已经','还有','不是','没有','什么','怎么','为什么','或者','如果','因为','所以','一下子','现在','今天','昨天','最近','一个','一些','这种','那个','这个'
}
TOPIC_RULES = [
    ('automation', {'automation','automate','workflow','cron','agent','agents','orchestrator','orchestration','dispatch','script'}),
    ('github', {'github','repo','repos','commit','commits','branch','branches','pr','pull','merge','git'}),
    ('dashboard', {'dashboard','chart','charts','board','analytics','metrics','quota','quotas','usage'}),
    ('design', {'design','ui','ux','style','visual','layout','apple','minimal','premium'}),
    ('docs', {'readme','docs','documentation','document','writing','copy','narrative'}),
    ('product', {'product','strategy','roadmap','feature','features','launch','positioning'}),
    ('coding', {'python','javascript','js','css','html','bug','debug','refactor','code'}),
    ('messaging', {'feishu','wechat','imessage','message','messages','chat','group'}),
]


def run_cmd(args):
    try:
        proc = subprocess.run(args, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return ''
    text = (proc.stdout or '') + ('\n' + proc.stderr if proc.stderr else '')
    return text.strip()


def extract_json_blob(text):
    start = text.find('{')
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i, ch in enumerate(text[start:], start=start):
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return text[start:]


def parse_sessions_cli(raw):
    decoder = json.JSONDecoder()
    idx = 0
    objects = []
    while idx < len(raw):
        brace = raw.find('{', idx)
        if brace == -1:
            break
        try:
            obj, end = decoder.raw_decode(raw, brace)
            objects.append(obj)
            idx = end
        except json.JSONDecodeError:
            idx = brace + 1
    sessions = []
    for obj in objects:
        if isinstance(obj, dict):
            if isinstance(obj.get('sessions'), list):
                sessions.extend(x for x in obj['sessions'] if isinstance(x, dict))
            elif isinstance(obj.get('recent'), list):
                sessions.extend(x for x in obj['recent'] if isinstance(x, dict))
    by_id = {}
    for item in sessions:
        sid = item.get('sessionId') or item.get('id') or item.get('key')
        if sid:
            by_id[sid] = item
    return list(by_id.values())


def parse_status_usage(raw):
    blob = extract_json_blob(raw)
    if not blob:
        return {}
    try:
        obj = json.loads(blob)
    except json.JSONDecodeError:
        return {}
    return obj.get('usage') or {}


def parse_iso(ts):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone(LOCAL_TZ)
    except Exception:
        return None


def coerce_dt(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if value > 10**12:
            value /= 1000.0
        return datetime.fromtimestamp(value, tz=timezone.utc).astimezone(LOCAL_TZ)
    if isinstance(value, str):
        return parse_iso(value)
    return None


def flatten_text(content):
    parts = []
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get('type') == 'text' and item.get('text'):
                parts.append(item['text'])
            elif item.get('type') == 'output_text' and item.get('text'):
                parts.append(item['text'])
    return '\n'.join(parts).strip()


def clean_user_text(text):
    text = re.sub(r'Conversation info \(untrusted metadata\):\s*```json.*?```', '', text, flags=re.S)
    text = re.sub(r'Sender \(untrusted metadata\):\s*```json.*?```', '', text, flags=re.S)
    text = re.sub(r'<file name=.*?</file>', '', text, flags=re.S)
    text = re.sub(r'\[media attached:.*?\]', '', text, flags=re.S)
    text = re.sub(r'To send an image back, prefer.*?security\.', '', text, flags=re.S)
    text = re.sub(r'\[message_id:.*?\]', '', text)
    text = re.sub(r'\[Feishu .*?\]', '', text)
    text = re.sub(r'\[(Mon|Tue|Wed|Thu|Fri|Sat|Sun).*?\]\s*', '', text)
    text = re.sub(r'\bou_[a-z0-9]{8,}\b', '', text)
    text = re.sub(r'\bom_[a-z0-9]{8,}\b', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\b[a-f0-9]{16,}\b', '', text)
    text = re.sub(r'System:\s*\[[^\]]+\]\s*Exec failed.*$', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip(' :\n\t')


def tokenize(text):
    text = text.lower()
    tokens = re.findall(r'[a-z][a-z0-9+.-]{2,}|[\u4e00-\u9fff]{2,}', text)
    clean = []
    for token in tokens:
        if token in STOPWORDS or token.isdigit() or len(token) > 24:
            continue
        if re.fullmatch(r'[a-z0-9-]+', token) and sum(ch.isdigit() for ch in token) >= 6:
            continue
        clean.append(token)
    return clean


def infer_tags(top_keywords, topic_counts, recent_titles):
    tags = []
    kw = set(top_keywords)
    if {'automation','workflow','agent'} & kw or topic_counts.get('automation', 0) >= 3:
        tags.append('Automation-minded')
    if topic_counts.get('github', 0) >= 2 or {'github','repo','commit'} & kw:
        tags.append('Builder on GitHub')
    if topic_counts.get('design', 0) >= 2 or {'design','ui','dashboard'} & kw:
        tags.append('Taste-driven')
    if topic_counts.get('product', 0) >= 2:
        tags.append('Product thinker')
    if {'python','javascript','code','debug'} & kw or topic_counts.get('coding', 0) >= 2:
        tags.append('Hands-on coder')
    if {'feishu','wechat','imessage'} & kw or topic_counts.get('messaging', 0) >= 2:
        tags.append('Multi-channel operator')
    if any(re.search(r'[\u4e00-\u9fff]', title or '') for title in recent_titles):
        tags.append('Bilingual workflow')
    if len(tags) < 4:
        tags.extend(['System thinker', 'Workflow designer', 'AI-native operator'])
    seen = []
    for tag in tags:
        if tag not in seen:
            seen.append(tag)
    return seen[:8]


def clean_assistant_text(text):
    text = re.sub(r'\[\[reply_to_current\]\]\s*', '', text or '')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def summarize_session(user_text, assistant_text):
    user = clean_user_text(user_text or '')
    assistant = clean_assistant_text(assistant_text or '')
    if assistant and not assistant.startswith('System:'):
        sentence = re.split(r'(?<=[。！？.!?])\s+|\n+', assistant)[0].strip()
        if 12 <= len(sentence) <= 180:
            return sentence
    if user:
        return (user[:157] + '...') if len(user) > 160 else user
    return 'No transcript summary available.'


def title_from_text(user_text, session_meta):
    text = clean_user_text(user_text or '')
    if not text:
        key = session_meta.get('key') or 'Session'
        return key.split(':')[-1][:48]
    first = re.split(r'[。！？.!?\n]+', text)[0].strip(' -:')
    if len(first) > 54:
        first = first[:51].rstrip() + '...'
    return first or 'Recent session'


def relative_time(dt):
    if not dt:
        return 'Unknown'
    now = datetime.now(LOCAL_TZ)
    day_diff = (now.date() - dt.date()).days
    if day_diff == 0:
        prefix = 'Today'
    elif day_diff == 1:
        prefix = 'Yesterday'
    else:
        prefix = dt.strftime('%b %-d') if sys.platform != 'win32' else dt.strftime('%b %#d')
    return f"{prefix} · {dt.strftime('%H:%M')}"


def infer_use_cases(topic_counts):
    items = []
    mapping = {
        'automation': ('Workflow automation', 'OpenClaw is being used to orchestrate scripts, agent flows, and repeatable personal ops.'),
        'github': ('GitHub shipping', 'A meaningful slice of the conversation history revolves around repos, commits, and publishing work.'),
        'dashboard': ('Usage analytics', 'The dashboard itself reflects an interest in measuring conversation volume, trends, and quota health.'),
        'design': ('Tasteful UI iteration', 'There is a recurring preference for clean presentation, visual restraint, and polished framing.'),
        'coding': ('Lightweight code delivery', 'Sessions often turn directly into scripts, frontend tweaks, and practical implementation work.'),
        'docs': ('Documentation as product', 'README and narrative polish show up as a real part of the workflow, not an afterthought.'),
    }
    for topic, count in sorted(topic_counts.items(), key=lambda kv: (-kv[1], kv[0])):
        if count <= 0 or topic not in mapping:
            continue
        title, description = mapping[topic]
        items.append({'title': title, 'description': description})
    if not items:
        items.append({'title': 'General assistant use', 'description': 'Recent local history is limited, so the board falls back to a broader OpenClaw usage snapshot.'})
    return items[:6]


def infer_insights(topic_counts, overview, keywords):
    insights = []
    if overview['activeDays'] >= 4:
        insights.append({'title': 'OpenClaw is part of the weekly workflow', 'description': f"Active on {overview['activeDays']} of the last 30 days, which looks more like a habit than occasional experimentation."})
    if topic_counts.get('automation', 0) + topic_counts.get('coding', 0) >= 3:
        insights.append({'title': 'Conversations skew toward building', 'description': 'Recent sessions are less about one-off Q&A and more about turning ideas into scripts, repos, dashboards, and automations.'})
    if any(k in keywords for k in ['design','dashboard','readme','ui']):
        insights.append({'title': 'Presentation quality matters', 'description': 'The topic mix suggests a bias toward clear structure and nice output, not just raw functionality.'})
    if not insights:
        insights.append({'title': 'History is still sparse', 'description': 'The generator found only a small amount of recent local history, so the board should get richer over time as more sessions accumulate.'})
    return insights[:3]


def infer_automation_ideas(topic_counts):
    ideas = []
    if topic_counts.get('automation', 0) >= 1:
        ideas.append({'title': 'Weekly board refresh', 'description': 'Regenerate the dashboard data, review the diff, then commit and push a fresh snapshot each week.'})
    ideas.append({'title': 'Keyword digest', 'description': 'Store weekly top keywords and topic clusters so the board can show trend changes instead of just a latest snapshot.'})
    if topic_counts.get('github', 0) >= 1:
        ideas.append({'title': 'Repo activity join-up', 'description': 'Pair session summaries with git commits to show which conversations actually turned into shipped changes.'})
    ideas.append({'title': 'Quota alert card', 'description': 'Highlight provider windows that are close to reset or close to exhaustion instead of only showing raw percentages.'})
    return ideas[:4]


def main():
    sessions_raw = run_cmd(['openclaw', 'sessions', '--json'])
    status_raw = run_cmd(['openclaw', 'status', '--json', '--usage'])
    session_items = parse_sessions_cli(sessions_raw)
    usage = parse_status_usage(status_raw)

    session_meta_by_id = {}
    for item in session_items:
        sid = item.get('sessionId') or item.get('id')
        if sid:
            session_meta_by_id[sid] = item

    transcript_paths = sorted(Path(os.path.expanduser('~/.openclaw/agents')).glob('*/sessions/*.jsonl'))
    now = datetime.now(LOCAL_TZ)
    day_counts_30 = defaultdict(int)
    recent_sessions = []
    keyword_counter = Counter()
    topic_counts = Counter()

    for path in transcript_paths:
        session_id = path.stem
        meta = session_meta_by_id.get(session_id, {})
        key_text = meta.get('key') or ''
        if ':subagent:' in key_text:
            continue
        messages = []
        session_started = None
        with path.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if obj.get('type') == 'session':
                    session_started = parse_iso(obj.get('timestamp'))
                if obj.get('type') == 'message' and isinstance(obj.get('message'), dict):
                    msg = obj['message']
                    ts = coerce_dt(msg.get('timestamp')) or parse_iso(obj.get('timestamp')) or session_started
                    text = flatten_text(msg.get('content'))
                    if msg.get('role') == 'user' and ('[Subagent Context]' in text or '[Subagent Task]' in text):
                        continue
                    messages.append({'role': msg.get('role'), 'text': text, 'timestamp': ts})
        if not messages and not session_started:
            continue
        times = [m['timestamp'] for m in messages if m['timestamp']]
        session_dt = max(times) if times else session_started
        if not session_dt:
            continue
        days_ago = (now.date() - session_dt.date()).days
        if 0 <= days_ago < 30:
            day_counts_30[session_dt.date().isoformat()] += 1

        user_messages = [m for m in messages if m['role'] == 'user']
        assistant_messages = [m for m in messages if m['role'] == 'assistant']
        latest_user = next((clean_user_text(m['text']) for m in reversed(user_messages) if clean_user_text(m['text'])), '')
        latest_assistant = next((clean_assistant_text(m['text']) for m in reversed(assistant_messages) if clean_assistant_text(m['text'])), '')
        all_user_text = ' '.join(clean_user_text(m['text']) for m in user_messages)
        if not latest_user and not all_user_text:
            continue
        tokens = tokenize(all_user_text)
        keyword_counter.update(tokens)
        session_topics = set()
        token_set = set(tokens)
        for topic, words in TOPIC_RULES:
            if token_set & words:
                session_topics.add(topic)
        topic_counts.update(session_topics)
        meta = session_meta_by_id.get(session_id, {})
        recent_sessions.append({
            'sessionId': session_id,
            'dt': session_dt,
            'title': title_from_text(latest_user or all_user_text, meta),
            'time': relative_time(session_dt),
            'summary': summarize_session(latest_user or all_user_text, latest_assistant),
            'tags': list(session_topics)[:3] or [meta.get('kind', 'session')],
            'tokens': tokens,
        })

    today = now.date().isoformat()
    today_count = day_counts_30.get(today, 0)
    week_count = sum(count for day, count in day_counts_30.items() if datetime.fromisoformat(day).date() >= now.date() - timedelta(days=6))
    active_days = sum(1 for count in day_counts_30.values() if count > 0)
    top_keywords = [word for word, _ in keyword_counter.most_common(12)]
    recent_sessions.sort(key=lambda x: x['dt'], reverse=True)

    daily_7 = []
    for i in range(6, -1, -1):
        d = now.date() - timedelta(days=i)
        daily_7.append({'day': d.strftime('%a'), 'date': d.isoformat(), 'count': day_counts_30.get(d.isoformat(), 0)})
    daily_30 = []
    for i in range(29, -1, -1):
        d = now.date() - timedelta(days=i)
        daily_30.append({'day': d.strftime('%m-%d'), 'date': d.isoformat(), 'count': day_counts_30.get(d.isoformat(), 0)})

    model_quota = []
    for provider in usage.get('providers', []) if isinstance(usage, dict) else []:
        name = provider.get('displayName') or provider.get('provider') or 'Provider'
        for window in provider.get('windows', []) or []:
            used = max(0, min(100, int(window.get('usedPercent') or 0)))
            total = 100
            reset_dt = coerce_dt(window.get('resetAt'))
            reset_label = reset_dt.strftime('%m-%d %H:%M') if reset_dt else 'Unknown'
            model_quota.append({
                'model': f"{name} · {window.get('label', 'Window')}",
                'provider': provider.get('provider') or name,
                'windowLabel': window.get('label', 'Window'),
                'used': used,
                'total': total,
                'remaining': max(0, total - used),
                'usedPercent': used,
                'resetAt': window.get('resetAt'),
                'resetLabel': reset_label,
                'plan': provider.get('plan') or '',
            })
    if not model_quota:
        model_quota.append({'model': 'Usage data unavailable', 'provider': 'unknown', 'windowLabel': 'Window', 'used': 0, 'total': 100, 'remaining': 100, 'usedPercent': 0, 'resetAt': None, 'resetLabel': 'Unknown', 'plan': ''})

    recent_titles = [item['title'] for item in recent_sessions[:6]]
    profile_tags = infer_tags(top_keywords, topic_counts, recent_titles)
    data = {
        'meta': {
            'updatedAt': now.strftime('%Y-%m-%d %H:%M'),
            'source': 'generated from local OpenClaw CLI status, sessions, and transcript files',
            'generatedBy': 'scripts/generate_sample_data.py',
        },
        'profile': {
            'name': 'Susie',
            'primaryMode': 'Local OpenClaw activity snapshot',
        },
        'overview': {
            'todayConversations': today_count,
            'weekConversations': week_count,
            'activeDays': active_days,
            'topicCount': max(len(top_keywords), len(topic_counts)),
        },
        'dailyConversations': daily_7,
        'dailyConversations30': daily_30,
        'modelQuota': model_quota,
        'keywords': top_keywords,
        'profileTags': profile_tags,
        'useCases': infer_use_cases(topic_counts),
        'recentSessions': [
            {
                'title': item['title'],
                'time': item['time'],
                'summary': item['summary'],
                'tags': item['tags'],
            }
            for item in recent_sessions[:6]
        ],
        'insights': infer_insights(topic_counts, {
            'todayConversations': today_count,
            'weekConversations': week_count,
            'activeDays': active_days,
            'topicCount': max(len(top_keywords), len(topic_counts)),
        }, top_keywords),
        'automationIdeas': infer_automation_ideas(topic_counts),
    }
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Wrote {OUTPUT}')


if __name__ == '__main__':
    main()
