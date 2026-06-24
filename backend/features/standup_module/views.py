from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import DailyStandup
from .serializers import DailyStandupSerializer
from features.tenant_module.context import get_current_organization
from features.planner_module.models import Task
from features.blocker_module.models import TaskBlocker


class DailyStandupViewSet(viewsets.ModelViewSet):
    serializer_class = DailyStandupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return DailyStandup.objects.none()
        
        # Support team filtering / date queries
        queryset = DailyStandup.objects.filter(organization=organization).select_related('user')
        date_str = self.request.query_params.get('date')
        if date_str:
            queryset = queryset.filter(date=date_str)
        else:
            # Default to today
            queryset = queryset.filter(date=timezone.now().date())
        return queryset

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            user=self.request.user,
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    @action(detail=False, methods=['get'], url_path='generate-draft')
    def generate_draft(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        # 1. Fetch completed tasks (Yesterday)
        done_tasks = Task.objects.filter(
            assignee=request.user,
            organization=organization,
            status='DONE',
            updated_at__date__gte=yesterday
        )
        yesterday_items = [f"- {t.title} (Completed)" for t in done_tasks]
        yesterday_text = "\n".join(yesterday_items) if yesterday_items else "No completed tasks logged."

        # 2. Fetch planned tasks (Today)
        planned_tasks = Task.objects.filter(
            assignee=request.user,
            organization=organization,
            due_date=today
        ).exclude(status='DONE')
        today_items = [f"- {t.title} (Planned)" for t in planned_tasks]
        today_text = "\n".join(today_items) if today_items else "No planned tasks logged."

        # 3. Fetch active blockers (Blockers)
        blockers = TaskBlocker.objects.filter(
            task__assignee=request.user,
            organization=organization,
            status='ACTIVE'
        ).select_related('task')
        blocker_items = [f"- {b.task.title}: {b.description} ({b.blocker_type})" for b in blockers]
        blockers_text = "\n".join(blocker_items) if blocker_items else "No active blockers."

        return Response({
            'date': today,
            'yesterday_text': yesterday_text,
            'today_text': today_text,
            'blockers_text': blockers_text
        })

    @action(detail=False, methods=['get'], url_path='attendance')
    def get_attendance(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        
        # 1. Fetch organization members
        from features.rbac_module.models import TenantMembership
        memberships = TenantMembership.objects.filter(organization=organization).select_related('user')
        all_members = {m.user for m in memberships}

        # 2. Fetch standups submitted today
        submitted_standups = DailyStandup.objects.filter(organization=organization, date=today)
        submitted_users = {s.user for s in submitted_standups}

        missing_members = all_members - submitted_users

        return Response({
            'total_members': len(all_members),
            'submitted_count': len(submitted_users),
            'missing_count': len(missing_members),
            'missing_list': [{'email': u.email, 'name': f"{u.first_name} {u.last_name}".strip() or u.email} for u in missing_members]
        })

    @action(detail=False, methods=['get'], url_path='ai-summary')
    def get_ai_summary(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        standups = DailyStandup.objects.filter(organization=organization, date=today).select_related('user')

        if not standups.exists():
            return Response({
                'summary': "No daily standups submitted by the team today. AI summary could not be synthesized."
            })

        # Synthesize Standup Summary (Mock AI Generator using aggregated details)
        yesterday_points = []
        today_points = []
        blocker_points = []

        for s in standups:
            name = f"{s.user.first_name} {s.user.last_name}".strip() or s.user.email
            yesterday_points.append(f"**{name}**:\n{s.yesterday_text}")
            today_points.append(f"**{name}**:\n{s.today_text}")
            if s.blockers_text and s.blockers_text != "No active blockers.":
                blocker_points.append(f"**{name}**:\n{s.blockers_text}")

        summary = f"""### AI Team Standup Summary - {today}

#### Completed Achievements (Yesterday)
{chr(10).join(yesterday_points)}

#### Active Target Focus (Today)
{chr(10).join(today_points)}

#### Workspace Risks & Blockers
{chr(10).join(blocker_points) if blocker_points else "No blocking parameters logged by team members today."}
"""
        return Response({'summary': summary})
