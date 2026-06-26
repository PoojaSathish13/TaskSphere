"""
AI Standup Summarization — uses OpenAI if configured, falls back to deterministic logic.
"""
import os
from datetime import date, timedelta

def generate_standup(tasks: list, org_name: str = "Team") -> str:
    """Given a list of task dicts, produce a standup summary string."""
    today = date.today()
    yesterday = today - timedelta(days=1)

    done_yesterday = [t for t in tasks if t.get('status') == 'DONE']
    in_progress = [t for t in tasks if t.get('status') == 'IN_PROGRESS']
    blocked = [t for t in tasks if t.get('status') == 'BACKLOG' and t.get('priority') in ('URGENT', 'HIGH')]
    overdue = [t for t in tasks if t.get('due_date') and str(t['due_date']) < str(today) and t.get('status') != 'DONE']

    openai_key = os.environ.get('OPENAI_API_KEY', '')
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            task_summary = f"Done: {[t['title'] for t in done_yesterday]}\nIn Progress: {[t['title'] for t in in_progress]}\nBlocked: {[t['title'] for t in blocked]}\nOverdue: {[t['title'] for t in overdue]}"
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful project manager. Write a 3-4 sentence daily standup summary in plain English from the task data provided."},
                    {"role": "user", "content": task_summary}
                ],
                max_tokens=200
            )
            return resp.choices[0].message.content.strip()
        except Exception:
            pass

    # Fallback: deterministic
    lines = [f"📋 {org_name} Daily Standup — {today.strftime('%B %d, %Y')}"]
    if done_yesterday:
        lines.append(f"✅ Completed: {', '.join(t['title'] for t in done_yesterday[:3])}{'...' if len(done_yesterday) > 3 else ''}.")
    if in_progress:
        lines.append(f"🔄 In Progress: {', '.join(t['title'] for t in in_progress[:3])}{'...' if len(in_progress) > 3 else ''}.")
    if overdue:
        lines.append(f"⚠️ Overdue ({len(overdue)}): {', '.join(t['title'] for t in overdue[:2])}{'...' if len(overdue) > 2 else ''}.")
    if blocked:
        lines.append(f"🚫 High-priority Backlog: {', '.join(t['title'] for t in blocked[:2])}.")
    if not (done_yesterday or in_progress or overdue or blocked):
        lines.append("No active tasks for today.")
    return '\n'.join(lines)
