from collections import defaultdict, deque
from decimal import Decimal
from .models import Task, TaskDependency


def suggest_work_plan(user, organization_id, target_date=None):
    """
    Computes an optimized execution sequence for the user's daily work tasks.
    Enforces that blocker tasks are sequenced first, resolving ties by priority index 
    and task estimation lengths (Shortest Job First).
    """
    # 1. Fetch user tasks
    user_tasks = Task.objects.filter(
        assignee=user,
        organization_id=organization_id,
        status__in=['TODO', 'IN_PROGRESS', 'REVIEW']
    )
    
    task_map = {task.id: task for task in user_tasks}
    task_ids = set(task_map.keys())

    if not task_ids:
        return {"suggested_order": [], "risks": []}

    # 2. Build graph dependencies
    # Only include dependencies where both tasks are in the user's active set
    dependencies = TaskDependency.objects.filter(
        task_id__in=task_ids,
        depends_on_id__in=task_ids
    )

    adj = defaultdict(list)
    in_degree = {tid: 0 for tid in task_ids}

    for dep in dependencies:
        # depends_on blocks task -> depends_on must run first
        # Graph edge: depends_on -> task
        adj[dep.depends_on_id].append(dep.task_id)
        in_degree[dep.task_id] += 1

    # 3. Topological Sort (Kahn's algorithm)
    # Ranks ties: Priority (Urgent > High > Medium > Low) then shortest estimated hours
    def get_sorting_weight(tid):
        task = task_map[tid]
        # Priority mapping
        p_weights = {'URGENT': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0}
        p_val = p_weights.get(task.priority, 1)
        
        # Sort key weights: priority (descending), due date (ascending), estimated hours (ascending)
        # We negate the priority value because python sorts ascending by default, 
        # so higher weight numbers should come first
        due_val = task.due_date.toordinal() if task.due_date else 9999999
        est_val = float(task.estimated_hours)
        return (-p_val, due_val, est_val)

    # Find starting nodes (in_degree = 0)
    queue = [tid for tid in task_ids if in_degree[tid] == 0]
    
    # Sort starting nodes by weights
    queue.sort(key=get_sorting_weight)
    
    sorted_order = []
    
    while queue:
        # Pop highest priority node from current zero-in-degree nodes
        curr_id = queue.pop(0)
        sorted_order.append(curr_id)

        for neighbor in adj[curr_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                
        # Re-sort remaining queue entries to ensure sorting weights apply as nodes become available
        queue.sort(key=get_sorting_weight)

    # 4. Cycle/Circular Dependency Risk check
    has_cycle = len(sorted_order) != len(task_ids)
    risks = []

    if has_cycle:
        risks.append({
            "code": "CIRCULAR_DEPENDENCY",
            "message": "Circular dependencies detected in your task list. Sorting suggestion fell back to priority defaults.",
            "level": "CRITICAL"
        })
        # Fallback sorting: ignore dependencies, sort only by weight
        sorted_order = list(task_ids)
        sorted_order.sort(key=get_sorting_weight)

    # 5. Evaluate other Risk Indicators
    # A. Total Overload Workload check
    total_est = sum(task_map[tid].estimated_hours for tid in sorted_order)
    if total_est > Decimal("8.0"):
        risks.append({
            "code": "WORKLOAD_OVERLOAD",
            "message": f"Your planned workload ({total_est} hours) exceeds the daily 8-hour target limit.",
            "level": "WARNING"
        })

    # B. Past Due dates warnings
    from django.utils import timezone
    today = target_date or timezone.now().date()
    
    for tid in sorted_order:
        t = task_map[tid]
        if t.due_date and t.due_date < today:
            risks.append({
                "code": "PAST_DUE",
                "message": f"Task '{t.title}' is past its due date ({t.due_date}).",
                "level": "WARNING"
            })

    return {
        "suggested_order": [task_map[tid] for tid in sorted_order],
        "risks": risks
    }
