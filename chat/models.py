from django.conf import settings
from django.db import models

from meetings.models import Meeting


class ChatMessage(models.Model):
    """A message sent inside a MeetVerse meeting."""

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_chat_messages",
    )

    message = models.TextField(
        max_length=1000,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return (
            f"{self.sender.username} - "
            f"{self.meeting.meeting_code}"
        )