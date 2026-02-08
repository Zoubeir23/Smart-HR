from rest_framework import serializers


class VoiceQuerySerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1000)
    voice = serializers.ChoiceField(
        choices=['nova', 'alloy', 'echo'],
        default='nova',
    )


class VoiceResponseSerializer(serializers.Serializer):
    text_response = serializers.CharField()
    audio_url = serializers.CharField(allow_null=True, required=False)
    sources = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    mode = serializers.CharField()
