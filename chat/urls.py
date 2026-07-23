from django.urls import path

from . import views


urlpatterns = [
    path(
        "<str:meeting_code>/history/",
        views.chat_history,
        name="chat_history",
    ),

    path(
        "<str:meeting_code>/send/",
        views.save_chat_message,
        name="save_chat_message",
    ),
]