from rest_framework import serializers

from ai_agents.models import CVAnalysis


class CVAnalysisSerializer(serializers.ModelSerializer):
    application_id = serializers.IntegerField(source='application.id', read_only=True)
    job_title = serializers.CharField(source='application.job_offer.title', read_only=True)
    candidate_name = serializers.CharField(source='application.candidate.get_full_name', read_only=True)

    class Meta:
        model = CVAnalysis
        fields = [
            'id',
            'application_id',
            'job_title',
            'candidate_name',
            'selected',
            'feedback',
            'matching_skills',
            'missing_skills',
            'experience_level',
            'raw_response',
            'analyzed_at',
        ]


class AnalyzeCVRequestSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()


class ScheduleInterviewRequestSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()


class SendEmailRequestSerializer(serializers.Serializer):
    email_type = serializers.ChoiceField(choices=['selection', 'rejection'])
    application_id = serializers.IntegerField()


class ProcessApplicationRequestSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()
