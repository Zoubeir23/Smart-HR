from django.contrib import admin

from smart_hr.messaging.models import Conversation
from smart_hr.messaging.models import ConversationParticipant
from smart_hr.messaging.models import Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "kind", "subject", "created_by", "last_message_at", "created_at"]
    list_filter = ["kind", "created_at"]
    search_fields = ["subject", "participant_links__user__email"]
    inlines = [ConversationParticipantInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["body", "sender__email"]
    autocomplete_fields = ["conversation", "sender"]
