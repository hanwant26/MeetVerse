from django.contrib import admin

from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):

    list_display = [
        "sender",
        "meeting",
        "short_message",
        "created_at",
    ]

    search_fields = [
        "sender__username",
        "meeting__meeting_code",
        "meeting__title",
        "message",
    ]

    list_filter = [
        "created_at",
    ]

    readonly_fields = [
        "created_at",
    ]

    def short_message(self, obj):
        if len(obj.message) <= 60:
            return obj.message

        return f"{obj.message[:60]}..."

    short_message.short_description = "Message"