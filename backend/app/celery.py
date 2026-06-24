import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')

app = Celery('tasksphere')

# Read config from Django settings file using CELERY_ prefix namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in registered django applications
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
