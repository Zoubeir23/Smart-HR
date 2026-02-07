from django.db import models

# Create your models here.

class Formation(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    instructor = models.CharField(max_length=255)  # On peut remplacer par un nom d'instructeur

    def __str__(self):
        return self.title
    
class Meeting(models.Model):
    formation = models.ForeignKey(Formation, on_delete=models.CASCADE, related_name="meetings")
    title = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    meeting_link = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=[
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='scheduled')

    def __str__(self):
        return f"Meeting: {self.title} for {self.formation.title} ({self.start_time})"

class ZoomToken(models.Model):
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_in = models.CharField(max_length=50)
    token_type = models.CharField(max_length=50)
    scope = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Zoom Token: {self.created_at}"
