from django.urls import path

from . import moderation_views


urlpatterns = [
    path(
        "<str:meeting_code>/mute/<int:participant_id>/",
        moderation_views.mute_participant_microphone,
        name="mute_participant_microphone",
    ),
]