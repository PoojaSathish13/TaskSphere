import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer delivering real-time notification events.
    Groups connections by organization and individual user keys.
    """
    async def connect(self):
        self.user = self.scope["user"]
        
        # In a fully production system, JWT socket middleware assigns authenticated user here.
        # If user is anonymous, reject the connection.
        if self.user.is_anonymous:
            await self.close(code=4003)
            return

        # Fetch org_id query parameter
        query_params = dict(qp.split("=") for qp in self.scope["query_string"].decode().split("&") if "=" in qp)
        self.org_id = query_params.get("organization_id")
        
        if not self.org_id:
            await self.close(code=4000)
            return

        self.user_group_name = f"user_{self.user.id}"
        self.org_group_name = f"org_{self.org_id}"

        # Join groups
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
        await self.channel_layer.group_add(self.org_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave groups
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)
        if hasattr(self, 'org_group_name'):
            await self.channel_layer.group_discard(self.org_group_name, self.channel_name)

    async def receive(self, text_data):
        """Ignore client client-to-server text frames."""
        pass

    async def send_notification(self, event):
        """
        Handler invoked when notification is broadcast to a group channel.
        """
        notification = event["notification"]
        # Deliver event payload to browser client
        await self.send(text_data=json.dumps(notification))
