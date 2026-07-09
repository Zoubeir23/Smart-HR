from rest_framework import serializers

from smart_hr.survey.models import Survey
from smart_hr.survey.models import SurveyAnswer
from smart_hr.survey.models import SurveyQuestion


class SurveyQuestionSerializer(serializers.ModelSerializer):
    question_type_display = serializers.CharField(source="get_question_type_display", read_only=True)

    class Meta:
        model = SurveyQuestion
        fields = ["id", "text", "question_type", "question_type_display", "options", "order"]
        read_only_fields = ["id"]


class SurveySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    questions = SurveyQuestionSerializer(many=True, read_only=True)
    has_responded = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "description",
            "is_anonymous",
            "start_date",
            "end_date",
            "status",
            "status_display",
            "created_at",
            "questions",
            "has_responded",
        ]
        read_only_fields = ["id", "created_at"]

    def get_has_responded(self, obj: Survey) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return obj.responses.filter(respondent=request.user).exists()


class SurveyAnswerInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyAnswer
        fields = ["question", "text_answer", "selected_options"]
